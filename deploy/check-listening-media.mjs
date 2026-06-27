import { Client } from 'ssh2';
const password = process.env.VPS_PASSWORD;
const script = `
cd /var/www/itestu/app/api && node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const tests = await p.contentTest.findMany({
    where: { type: 'LISTENING', status: 'PUBLISHED' },
    select: {
      id: true, code: true, title: true, updatedAt: true,
      mediaAssets: { select: { key: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  console.log(JSON.stringify(tests.map(t => ({
    id: t.id, code: t.code, title: t.title,
    media: t.mediaAssets.map(a => a.key),
    updatedAt: t.updatedAt,
  })), null, 2));
  await p.\\$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
"
`;
const conn = new Client();
conn.on('ready', () => {
  conn.exec(script, (e, s) => {
    s.on('data', (d) => process.stdout.write(d));
    s.stderr.on('data', (d) => process.stderr.write(d));
    s.on('close', () => conn.end());
  });
}).connect({ host: '170.168.6.42', username: 'root', password, port: 22 });
