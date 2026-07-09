#!/usr/bin/env node
import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

const remoteScript = `
cd /var/www/itestu/app/api && node <<'EOFSCRIPT'
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const test = await p.contentTest.findFirst({
    where: { code: 'REA-MOCK-A002' },
    select: { code: true, answerKey: true, content: true },
  });
  const key = test?.answerKey || {};
  const missing = [];
  for (let n = 33; n <= 40; n++) {
    missing.push({ q: n, correct: key[String(n)] ?? null });
  }

  const content = test?.content;
  const passages = content?.passages || [];
  let maxQ = 0;
  let minQ = 999;
  const groups = [];
  for (const [pi, passage] of passages.entries()) {
    for (const [gi, group] of (passage.questionGroups || []).entries()) {
      const qs = (group.questions || []).map((q) => q.number ?? q.id);
      if (qs.length) {
        groups.push({
          passage: pi + 1,
          group: gi + 1,
          title: group.title || group.instructions?.slice?.(0, 60),
          questionNumbers: qs,
        });
        for (const n of qs) {
          if (n < minQ) minQ = n;
          if (n > maxQ) maxQ = n;
        }
      }
    }
  }

  const enroll = await p.enrollment.findFirst({
    where: { enrollmentCode: 'ENR-8503' },
    include: {
      examSession: {
        include: {
          sectionAttempts: {
            where: { skill: 'READING' },
            include: { answers: true },
          },
        },
      },
    },
  });
  const attempt = enroll?.examSession?.sectionAttempts?.[0];
  const answered = new Set((attempt?.answers || []).map((a) => a.questionNumber));

  console.log(JSON.stringify({
    test: test?.code,
    passageCount: passages.length,
    contentMinQ: minQ === 999 ? null : minQ,
    contentMaxQ: maxQ || null,
    questionGroups: groups,
    unanswered33to40: missing,
    studentHasAnswersFor: [...Array(40)].map((_, i) => i + 1).map((n) => ({ q: n, answered: answered.has(n) })),
    timeRemaining: attempt?.timeRemaining,
    submittedAt: attempt?.submittedAt,
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
