#!/usr/bin/env node
import { Client } from 'ssh2';
import { assertVpsCredentials, VPS } from './lib/vps.js';

assertVpsCredentials();

const script = `cd /var/www/itestu/app/api && node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const tests = await p.contentTest.findMany({
    select: {
      id: true,
      code: true,
      title: true,
      type: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      institutionId: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  const media = await p.mediaAsset.findMany({
    select: { id: true, testId: true, key: true, url: true, mimeType: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const audits = await p.auditLog.findMany({
    where: { entity: 'content_test' },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { user: { select: { email: true, name: true } } },
  });
  console.log(JSON.stringify({ tests, media, audits }, null, 2));
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
NODE`;

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(script, (err, stream) => {
      if (err) throw err;
      stream.on('data', (d) => process.stdout.write(d));
      stream.stderr.on('data', (d) => process.stderr.write(d));
      stream.on('close', (code) => {
        conn.end();
        process.exit(code ?? 0);
      });
    });
  })
  .connect({
    host: VPS.host,
    username: VPS.username,
    password: VPS.password,
    port: VPS.port,
  });
