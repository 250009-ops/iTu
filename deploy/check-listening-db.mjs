import { Client } from 'ssh2';

const host = process.env.VPS_HOST || '170.168.6.42';
const password = process.env.VPS_PASSWORD;
if (!password) {
  console.error('Set VPS_PASSWORD');
  process.exit(1);
}

const script = `
cd /var/www/itestu/app/api && node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const pkgs = await p.mockTestPackage.findMany({
    select: { slug: true, skills: true, listeningTestId: true, isActive: true },
  });
  const tests = await p.contentTest.findMany({
    where: { type: 'LISTENING' },
    select: { id: true, code: true, title: true, status: true },
    orderBy: { updatedAt: 'desc' },
  });
  const enroll = await p.enrollment.findFirst({
    where: { status: { in: ['ENROLLED', 'IN_PROGRESS'] } },
    orderBy: { createdAt: 'desc' },
    include: {
      package: { select: { slug: true, listeningTestId: true, skills: true } },
      examSession: { select: { sessionCode: true } },
    },
  });
  console.log(JSON.stringify({ pkgs, tests, enroll }, null, 2));
  await p.\\$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
"
`;

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(script, (err, stream) => {
      if (err) throw err;
      stream.on('data', (d) => process.stdout.write(d));
      stream.stderr.on('data', (d) => process.stderr.write(d));
      stream.on('close', () => conn.end());
    });
  })
  .connect({ host, username: 'root', password, port: 22 });
