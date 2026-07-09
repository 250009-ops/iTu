#!/usr/bin/env node
/**
 * Inspect a student's Listening/Reading wrong answers on production VPS.
 * Usage: VPS_PASSWORD=... node deploy/inspect-student-lr-answers.mjs [name] [enrollmentCode]
 */
import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

const studentName = process.argv[2] || 'Sardor';
const enrollmentCode = process.argv[3] || 'ENR-8503';

const remoteScript = String.raw`
cd /var/www/itestu/app/api && node <<'EOFSCRIPT'
const { PrismaClient } = require('@prisma/client');

function normalizeAnswer(v) {
  return String(v ?? '').trim().toLowerCase();
}
function expandExpectedAlternatives(expected) {
  if (Array.isArray(expected)) return expected.map(String).filter((s) => s.trim());
  const raw = String(expected ?? '').trim();
  if (!raw) return [];
  if (raw.includes(' / ')) return raw.split(' / ').map((s) => s.trim()).filter(Boolean);
  if (raw.includes('|')) return raw.split('|').map((s) => s.trim()).filter(Boolean);
  return [raw];
}
function matchAnswer(submitted, expected) {
  const submittedIsArray = Array.isArray(submitted);
  const expectedIsArray = Array.isArray(expected);
  if (expectedIsArray && submittedIsArray) {
    const sortedExpected = expandExpectedAlternatives(expected).map(normalizeAnswer).sort();
    const sortedSubmitted = submitted
      .map((s) => normalizeAnswer(String(s)))
      .filter(Boolean)
      .sort();
    return JSON.stringify(sortedExpected) === JSON.stringify(sortedSubmitted);
  }
  if (expectedIsArray && !submittedIsArray) {
    const normalizedSubmitted = normalizeAnswer(String(submitted ?? ''));
    return expandExpectedAlternatives(expected).some(
      (alt) => normalizeAnswer(String(alt)) === normalizedSubmitted,
    );
  }
  const alternatives = expandExpectedAlternatives(expected);
  if (!alternatives.length) return false;
  const submittedStr = submittedIsArray
    ? submitted.map((s) => String(s)).join(' ')
    : String(submitted ?? '');
  const normalizedSubmitted = normalizeAnswer(submittedStr);
  return alternatives.some((alt) => normalizeAnswer(alt) === normalizedSubmitted);
}
function formatValue(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}
function analyze(answers, answerKey) {
  const answerByNumber = new Map(answers.map((a) => [a.questionNumber, a.value]));
  const scoredNumbers = new Set();
  const results = [];
  for (const [k, v] of Object.entries(answerKey || {})) {
    if (!k.startsWith('$set$') || typeof v !== 'string' || !v.trim()) continue;
    const match = k.match(/^\$set\$(\d+)-(\d+)$/);
    if (!match) continue;
    const from = Number(match[1]);
    const to = Number(match[2]);
    const expected = v.split(',').map(normalizeAnswer).filter(Boolean).sort();
    const nums = [];
    for (let n = from; n <= to; n++) nums.push(n);
    const submitted = nums
      .map((n) => answerByNumber.get(n))
      .filter((val) => typeof val === 'string' && val.trim())
      .map((val) => normalizeAnswer(String(val)))
      .sort();
    const correct =
      expected.length > 0 &&
      submitted.length === expected.length &&
      JSON.stringify(submitted) === JSON.stringify(expected);
    for (const n of nums) {
      scoredNumbers.add(n);
      results.push({
        q: n,
        submitted: formatValue(answerByNumber.get(n)) || '(blank)',
        expected: v,
        correct,
        note: 'set question',
      });
    }
  }
  for (const answer of answers) {
    if (scoredNumbers.has(answer.questionNumber)) continue;
    const key = answerKey?.[String(answer.questionNumber)];
    if (!key) continue;
    const correct = matchAnswer(answer.value, key);
    const expectedDisplay = Array.isArray(key) ? key.join(' / ') : String(key);
    results.push({
      q: answer.questionNumber,
      submitted: formatValue(answer.value) || '(blank)',
      expected: expectedDisplay,
      correct,
    });
  }
  results.sort((a, b) => a.q - b.q);
  return results;
}

const studentName = ${JSON.stringify(studentName)};
const enrollmentCode = ${JSON.stringify(enrollmentCode)};

const p = new PrismaClient();
(async () => {
  const user = await p.user.findFirst({
    where: { name: { contains: studentName, mode: 'insensitive' } },
    include: { studentProfile: true },
  });
  if (!user?.studentProfile) {
    console.log(JSON.stringify({ error: 'Student not found', studentName }));
    await p.$disconnect();
    return;
  }

  let enroll = await p.enrollment.findFirst({
    where: { studentId: user.studentProfile.id, enrollmentCode },
    include: {
      package: { select: { slug: true, title: true } },
      examSession: {
        include: {
          sectionAttempts: {
            where: { skill: { in: ['LISTENING', 'READING'] } },
            include: {
              answers: { orderBy: { questionNumber: 'asc' } },
              contentTest: { select: { code: true, title: true, answerKey: true } },
            },
          },
        },
      },
    },
  });

  if (!enroll) {
    const all = await p.enrollment.findMany({
      where: { studentId: user.studentProfile.id },
      select: { enrollmentCode: true, mockDate: true },
      orderBy: { createdAt: 'desc' },
    });
    enroll = await p.enrollment.findFirst({
      where: { studentId: user.studentProfile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        package: { select: { slug: true, title: true } },
        examSession: {
          include: {
            sectionAttempts: {
              where: { skill: { in: ['LISTENING', 'READING'] } },
              include: {
                answers: { orderBy: { questionNumber: 'asc' } },
                contentTest: { select: { code: true, title: true, answerKey: true } },
              },
            },
          },
        },
      },
    });
    if (!enroll) {
      console.log(JSON.stringify({ error: 'No enrollments', student: user.name, enrollments: all }, null, 2));
      await p.$disconnect();
      return;
    }
  }

  const out = {
    student: user.name,
    email: user.email,
    enrollmentCode: enroll.enrollmentCode,
    package: enroll.package?.title || enroll.package?.slug,
    mockDate: enroll.mockDate,
    sections: {},
  };

  for (const attempt of enroll.examSession?.sectionAttempts || []) {
    const key = attempt.contentTest?.answerKey;
    const analysis = analyze(attempt.answers, key);
    const wrong = analysis.filter((r) => !r.correct);
    out.sections[attempt.skill] = {
      test: attempt.contentTest?.code,
      testTitle: attempt.contentTest?.title,
      rawScore: attempt.rawScore,
      band: attempt.band,
      totalQuestions: analysis.length,
      wrongCount: wrong.length,
      wrong,
    };
  }

  console.log(JSON.stringify(out, null, 2));
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
EOFSCRIPT
`;

assertVpsCredentials();

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(remoteScript, (err, stream) => {
      if (err) throw err;
      stream.on('data', (d) => process.stdout.write(d));
      stream.stderr.on('data', (d) => process.stderr.write(d));
      stream.on('close', (code) => {
        conn.end();
        process.exit(code ?? 0);
      });
    });
  })
  .connect(VPS);
