#!/usr/bin/env node
import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

const remoteScript = `
cd /var/www/itestu/app/api && node <<'EOFSCRIPT'
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const test = await p.contentTest.findFirst({ where: { code: 'REA-MOCK-A002' }, select: { content: true } });
  const p3 = test?.content?.passages?.[2];
  const groups = p3?.groups || [];
  const detail = groups.map((g) => ({
    id: g.id,
    type: g.type,
    from: g.from,
    to: g.to,
    title: g.title,
    questionCount: g.questions?.length,
    questions: g.questions?.map((q) => ({ n: q.n, prompt: q.prompt?.slice?.(0, 60) })),
    lineGapNumbers: [],
    linesPreview: g.lines?.slice?.(0, 2),
  }));
  for (const g of groups) {
    const d = detail.find((x) => x.id === g.id);
    if (g.lines) {
      const nums = [];
      const walk = (nodes) => {
        for (const node of nodes || []) {
          if (node?.type === 'gap' && typeof node.n === 'number') nums.push(node.n);
          if (node?.children) walk(node.children);
          if (node?.nodes) walk(node.nodes);
        }
      };
      for (const line of g.lines) {
        walk(line.nodes || line);
      }
      d.lineGapNumbers = [...new Set(nums)].sort((a,b)=>a-b);
    }
  }
  console.log(JSON.stringify({ passage3Title: p3?.title, groups: detail }, null, 2));
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
