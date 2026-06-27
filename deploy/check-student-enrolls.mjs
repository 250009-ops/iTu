import { Client } from 'ssh2';
const password = process.env.VPS_PASSWORD;
const script = `
cd /var/www/itestu/app/api && node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const user = await p.user.findFirst({ where: { email: 'student@example.com' }, include: { studentProfile: true } });
  const enrolls = await p.enrollment.findMany({
    where: { studentId: user?.studentProfile?.id },
    orderBy: { createdAt: 'desc' },
    include: {
      package: { select: { slug: true, skills: true, listeningTestId: true } },
      examSession: { select: { sessionCode: true, state: true } },
    },
  });
  console.log(JSON.stringify(enrolls, null, 2));
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
