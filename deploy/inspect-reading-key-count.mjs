#!/usr/bin/env node
/** Inspect reading answer key vs student answers for a test/enrollment. */
import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

const enrollmentCode = process.argv[2] || 'ENR-8503';

const remoteScript = `
cd /var/www/itestu/app/api && node <<'EOFSCRIPT'
const { PrismaClient } = require('@prisma/client');
const enrollmentCode = ${JSON.stringify(enrollmentCode)};
const p = new PrismaClient();

function countAnswerKeyEntries(key) {
  if (!key || typeof key !== 'object') return { numbered: 0, sets: [], totalScoredSlots: 0, keys: [] };
  const numbered = [];
  const sets = [];
  for (const [k, v] of Object.entries(key)) {
    if (k.startsWith('$set$')) {
      const m = k.match(/^\\$set\\$(\\d+)-(\\d+)$/);
      if (m) {
        const from = Number(m[1]);
        const to = Number(m[2]);
        const count = to - from + 1;
        sets.push({ key: k, from, to, count, value: v });
      }
    } else if (/^\\d+$/.test(k)) {
      numbered.push(Number(k));
    }
  }
  const setSlots = sets.reduce((s, x) => s + x.count, 0);
  const allNums = new Set(numbered);
  for (const s of sets) {
    for (let n = s.from; n <= s.to; n++) allNums.add(n);
  }
  return {
    numberedCount: numbered.length,
    setGroups: sets,
    setSlotCount: setSlots,
    uniqueQuestionNumbers: [...allNums].sort((a, b) => a - b),
    totalUniqueSlots: allNums.size,
    missingFrom1To40: [...Array(40)].map((_, i) => i + 1).filter((n) => !allNums.has(n)),
  };
}

function countQuestionsInContent(content) {
  const nums = new Set();
  for (const passage of content?.passages || []) {
    for (const group of passage?.questionGroups || []) {
      for (const q of group?.questions || []) {
        if (typeof q.number === 'number') nums.add(q.number);
        else if (typeof q.id === 'number') nums.add(q.id);
      }
    }
  }
  return [...nums].sort((a, b) => a - b);
}

(async () => {
  const enroll = await p.enrollment.findFirst({
    where: { enrollmentCode },
    include: {
      examSession: {
        include: {
          sectionAttempts: {
            where: { skill: 'READING' },
            include: {
              answers: { orderBy: { questionNumber: 'asc' } },
              contentTest: { select: { code: true, title: true, answerKey: true, content: true } },
            },
          },
        },
      },
    },
  });
  const attempt = enroll?.examSession?.sectionAttempts?.[0];
  const test = attempt?.contentTest;
  const keyInfo = countAnswerKeyEntries(test?.answerKey);
  const contentQs = countQuestionsInContent(test?.content);
  const submittedNums = attempt?.answers.map((a) => a.questionNumber) || [];
  const submittedSet = new Set(submittedNums);

  console.log(JSON.stringify({
    enrollmentCode,
    test: test?.code,
    testTitle: test?.title,
    rawScore: attempt?.rawScore,
    band: attempt?.band,
    answerKeyAnalysis: keyInfo,
    contentQuestionNumbers: contentQs,
    contentQuestionCount: contentQs.length,
    studentAnswerCount: submittedNums.length,
    studentAnswerNumbers: submittedNums,
    studentMissingFromContent: contentQs.filter((n) => !submittedSet.has(n)),
    contentMissingFromAnswerKey: contentQs.filter((n) => !keyInfo.uniqueQuestionNumbers.includes(n)),
  }, null, 2));
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
EOFSCRIPT
`;

assertVpsCredentials();
const conn = new Client();
conn.on('ready', () => {
  conn.exec(remoteScript, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
    stream.on('close', (code) => { conn.end(); process.exit(code ?? 0); });
  });
}).connect(VPS);
