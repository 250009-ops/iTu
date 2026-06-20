import { Client } from 'ssh2';

const password = process.env.VPS_PASSWORD;
if (!password) process.exit(1);

const script = `
cd /var/www/itestu/app/api && node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const test = await p.contentTest.findUnique({
    where: { id: 'cmqfchke9000b6l7o4h5bjf4k' },
    select: {
      id: true, code: true, status: true,
      content: true,
      mediaAssets: { select: { key: true, url: true } },
    },
  });
  const sessions = await p.examSession.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      sessionCode: true,
      enrollment: {
        select: {
          package: { select: { slug: true, listeningTestId: true, skills: true } },
        },
      },
    },
  });
  console.log(JSON.stringify({ test: test ? {
    id: test.id, code: test.code, status: test.status,
    parts: test.content?.parts?.length,
    mediaKeys: test.mediaAssets.map(a => a.key),
  } : null, sessions }, null, 2));
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
