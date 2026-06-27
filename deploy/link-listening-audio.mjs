import { Client } from 'ssh2';

const password = process.env.VPS_PASSWORD;
if (!password) process.exit(1);

const script = `
cd /var/www/itestu/app/api && node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const listening = await p.contentTest.findFirst({
    where: {
      type: 'LISTENING',
      status: 'PUBLISHED',
      mediaAssets: { some: { key: 'full-audio' } },
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, code: true },
  });
  if (!listening) {
    console.log('No published listening test with full-audio found');
    process.exit(0);
  }
  const updated = await p.mockTestPackage.updateMany({
    where: {
      skills: { array_contains: 'listening' },
    },
    data: { listeningTestId: listening.id },
  });
  console.log('Linked', updated.count, 'package(s) to', listening.code, listening.id);
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
