#!/usr/bin/env node
/**
 * Upload clear-all-mocks.ts and run it on production.
 * Usage: VPS_PASSWORD=... node deploy/clear-all-mocks.mjs
 * Dry inspect only: VPS_PASSWORD=... node deploy/clear-all-mocks.mjs --inspect
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_LOCAL = join(__dirname, '../api/scripts/clear-all-mocks.ts');
const SCRIPT_REMOTE = '/var/www/itestu/app/api/scripts/clear-all-mocks.ts';
const inspectOnly = process.argv.includes('--inspect');

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

  if (inspectOnly) {
    console.log('==> Inspecting production mock inventory...');
    await exec(
      conn,
      `cd /var/www/itestu/app/api && npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const [packages, tests, sets, enrollments, pool] = await Promise.all([
    prisma.mockTestPackage.findMany({ select: { title: true, slug: true, mockNumber: true, isActive: true }, orderBy: { mockNumber: 'asc' } }),
    prisma.contentTest.findMany({ select: { code: true, title: true, type: true, status: true, institutionId: true }, orderBy: { code: 'asc' } }),
    prisma.institutionMockSet.findMany({ select: { title: true, slug: true }, orderBy: { title: 'asc' } }),
    prisma.enrollment.count(),
    prisma.packageContentTest.count(),
  ]);
  console.log('PACKAGES', packages.length);
  for (const p of packages) console.log('  PKG', p.mockNumber, p.title, p.slug, p.isActive ? 'active' : 'inactive');
  console.log('CONTENT_TESTS', tests.length);
  for (const t of tests) console.log('  TEST', t.type, t.code, t.status, t.institutionId ? 'institution' : 'platform');
  console.log('MOCK_SETS', sets.length);
  for (const s of sets) console.log('  SET', s.title, s.slug);
  console.log('enrollments', enrollments, 'pool_links', pool);
  await prisma.\\$disconnect();
}
run().catch((e) => { console.error(e); process.exit(1); });
"`,
    );
    conn.end();
    return;
  }

  console.log('==> Uploading clear-all-mocks.ts...');
  const sftp = await new Promise((resolve, reject) =>
    conn.sftp((e, s) => (e ? reject(e) : resolve(s))),
  );
  await new Promise((resolve, reject) =>
    sftp.writeFile(SCRIPT_REMOTE, readFileSync(SCRIPT_LOCAL), (e) =>
      e ? reject(e) : resolve(),
    ),
  );

  console.log('==> Running wipe on production (--confirm)...');
  await exec(
    conn,
    'cd /var/www/itestu/app/api && npx tsx scripts/clear-all-mocks.ts --confirm',
  );

  console.log('\n==> Post-wipe inventory + next identity check...');
  await exec(
    conn,
    `cd /var/www/itestu/app/api && npx tsx -e "
import { PrismaClient } from '@prisma/client';
import { nextTestIdentity } from './src/modules/content/content-test-naming.ts';
const prisma = new PrismaClient();
async function run() {
  const [packages, tests, sets] = await Promise.all([
    prisma.mockTestPackage.count(),
    prisma.contentTest.count(),
    prisma.institutionMockSet.count(),
  ]);
  console.log('remaining packages=', packages, 'content_tests=', tests, 'mock_sets=', sets);
  for (const type of ['LISTENING', 'READING', 'WRITING', 'SPEAKING']) {
    const existing = await prisma.contentTest.findMany({
      where: { type, institutionId: null },
      select: { code: true, title: true },
    });
    const next = nextTestIdentity(type, existing);
    console.log('next', type, next.code, next.title);
  }
  await prisma.\\$disconnect();
}
run().catch((e) => { console.error(e); process.exit(1); });
"`,
  );

  conn.end();
  console.log('\n==> Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
