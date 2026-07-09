#!/usr/bin/env node
/** Deep inspect reading attempt: content numbering vs saved answers vs answer key. */
import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

const enrollmentCode = process.argv[2] || 'ENR-8503';

const remoteScript = `
cd /var/www/itestu/app/api && node <<'EOFSCRIPT'
const { PrismaClient } = require('@prisma/client');
const enrollmentCode = ${JSON.stringify(enrollmentCode)};
const p = new PrismaClient();

function gapsInGroup(g) {
  const nums = [];
  const from = g.from ?? g.start ?? 0;
  const to = g.to ?? g.end ?? 0;
  for (let n = from; n <= to; n++) nums.push(n);
  return nums;
}

function collectContentNumbers(content) {
  const nums = [];
  for (const passage of content?.passages || []) {
    for (const g of passage?.groups || passage?.questionGroups || []) {
      nums.push(...gapsInGroup(g));
      for (const q of g?.questions || []) {
        if (typeof q.number === 'number') nums.push(q.number);
      }
    }
  }
  return [...new Set(nums)].sort((a, b) => a - b);
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
              contentTest: true,
            },
          },
        },
      },
    },
  });

  const attempt = enroll?.examSession?.sectionAttempts?.[0];
  const test = attempt?.contentTest;
  const content = test?.content;
  const key = test?.answerKey || {};

  const contentNums = collectContentNumbers(content);
  const keyNums = Object.keys(key)
    .filter((k) => /^\\d+$/.test(k))
    .map(Number)
    .sort((a, b) => a - b);
  const savedNums = attempt?.answers.map((a) => a.questionNumber) || [];

  const passages = (content?.passages || []).map((passage, pi) => ({
    passageIndex: pi + 1,
    id: passage.id,
    title: passage.title?.slice?.(0, 80),
    totalQuestions: passage.totalQuestions,
    groups: (passage.groups || passage.questionGroups || []).map((g, gi) => ({
      groupIndex: gi + 1,
      type: g.type,
      from: g.from,
      to: g.to,
      questionCount: g.to && g.from ? g.to - g.from + 1 : (g.questions?.length ?? 0),
      numbers: gapsInGroup(g),
    })),
  }));

  const contentTotal = content?.totalQuestions;
  const durationMin = content?.durationMinutes;
  const startedAt = attempt?.startedAt;
  const submittedAt = attempt?.submittedAt;
  const elapsedMs =
    startedAt && submittedAt ? new Date(submittedAt) - new Date(startedAt) : null;

  const missingFromDb = [...Array(40)].map((_, i) => i + 1).filter((n) => !savedNums.includes(n));
  const missingFromContent = keyNums.filter((n) => !contentNums.includes(n));
  const extraInContent = contentNums.filter((n) => !keyNums.includes(n));

  const answersDetail = attempt?.answers.map((a) => ({
    q: a.questionNumber,
    type: a.questionType,
    value: a.value,
    revision: a.revision,
    updatedAt: a.updatedAt,
  }));

  console.log(JSON.stringify({
    enrollmentCode,
    test: test?.code,
    contentTotalQuestions: contentTotal,
    durationMinutes: durationMin,
    startedAt,
    submittedAt,
    elapsedMinutes: elapsedMs != null ? Math.round(elapsedMs / 60000) : null,
    timeRemainingSeconds: attempt?.timeRemaining,
    rawScore: attempt?.rawScore,
    band: attempt?.band,
    savedAnswerCount: savedNums.length,
    contentQuestionCount: contentNums.length,
    answerKeyCount: keyNums.length,
    contentQuestionNumbers: contentNums,
    missingInDatabase: missingFromDb,
    missingInContentButInKey: missingFromContent,
    inContentNotInKey: extraInContent,
    passages,
    lastSavedAnswers: answersDetail?.slice(-12),
    firstMissingKeyAnswers: missingFromDb.map((n) => ({ q: n, correct: key[String(n)] })),
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
