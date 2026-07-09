#!/usr/bin/env node
/**
 * Reset Full Mock 001 pilot enrollments on production, then repair unique L/R/W.
 * Usage: VPS_PASSWORD=... node deploy/reset-mock001-pilot.mjs
 */
import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

const PACKAGE_SLUG = 'full-academic-mock-a002';

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let errOut = '';
      stream.on('data', (d) => process.stdout.write(d));
      stream.stderr.on('data', (d) => {
        errOut += d.toString();
        process.stderr.write(d);
      });
      stream.on('close', (c) =>
        c === 0 ? resolve() : reject(new Error(errOut || `exit ${c}`)),
      );
    });
  });
}

async function main() {
  assertVpsCredentials();
  const conn = new Client();
  await new Promise((resolve, reject) =>
    conn.on('ready', resolve).on('error', reject).connect(VPS),
  );

  console.log(`==> Reset pilot for ${PACKAGE_SLUG}...`);
  await exec(
    conn,
    `cd /var/www/itestu/app/api && npx tsx -e "
import { PrismaClient, EnrollmentStatus, SlotStatus } from '@prisma/client';
import { purgeEnrollments } from './src/modules/admin/enrollment-cleanup.ts';

const slug = '${PACKAGE_SLUG}';
const prisma = new PrismaClient();

async function run() {
  const pkg = await prisma.mockTestPackage.findFirst({ where: { slug } });
  if (!pkg) throw new Error('Package not found: ' + slug);

  const inProgress = await prisma.enrollment.count({
    where: { packageId: pkg.id, status: EnrollmentStatus.IN_PROGRESS },
  });
  if (inProgress > 0) {
    throw new Error('Cannot reset while ' + inProgress + ' exam(s) in progress');
  }

  const before = await prisma.enrollment.findMany({
    where: { packageId: pkg.id },
    include: { student: { include: { user: { select: { name: true, email: true } } } } },
  });
  for (const e of before) {
    console.log('Clearing enrollment:', e.enrollmentCode, '-', e.student.user.name, e.student.user.email);
  }

  const purged = await purgeEnrollments(prisma, { packageId: pkg.id });
  console.log('Pilot reset:', JSON.stringify(purged));

  const student = await prisma.user.findFirst({
    where: { name: { contains: 'Ozodbek', mode: 'insensitive' } },
    include: { studentProfile: true },
  });
  if (student?.studentProfile) {
    const remaining = await prisma.enrollment.count({
      where: { studentId: student.studentProfile.id },
    });
    console.log('Ozodbek remaining enrollments:', remaining, '| studentId:', student.studentProfile.id);
  }

  await prisma.\\$disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
"`,
  );

  console.log('==> Repair mock content assignments...');
  await exec(conn, 'cd /var/www/itestu/app/api && npm run content:repair-mocks');

  console.log('==> Verify package content...');
  await exec(
    conn,
    `cd /var/www/itestu/app/api && npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const packages = await prisma.mockTestPackage.findMany({
    where: { packageKind: 'listening+reading+writing+speaking' },
    orderBy: { mockNumber: 'asc' },
    include: {
      _count: { select: { enrollments: true } },
      listeningTest: { select: { code: true } },
      readingTest: { select: { code: true } },
      writingTest: { select: { code: true } },
    },
  });
  for (const p of packages) {
    console.log(
      p.slug,
      '| enrollments:', p._count.enrollments,
      '| L:', p.listeningTest?.code ?? '-',
      '| R:', p.readingTest?.code ?? '-',
      '| W:', p.writingTest?.code ?? '-',
    );
  }
  await prisma.\\$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
"`,
  );

  conn.end();
  console.log('\\nMock 001 pilot reset and content repair complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
