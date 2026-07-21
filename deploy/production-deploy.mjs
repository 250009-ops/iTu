#!/usr/bin/env node
/**
 * Enterprise production deploy:
 * 1. Upload api + web source
 * 2. Rebuild on VPS (preserves server .env files)
 * 3. Restart PM2 + run health checks on itestu.uz
 *
 * Usage:
 *   VPS_PASSWORD=... node deploy/production-deploy.mjs
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

const ROOT = join(import.meta.dirname, '..');
const DOMAIN = process.env.DEPLOY_DOMAIN || 'itestu.uz';

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

function upload(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.writeFile(remote, readFileSync(local), (e) =>
      e ? reject(e) : resolve(),
    );
  });
}

async function main() {
  assertVpsCredentials();

  const tarPath = join(tmpdir(), 'itestu-production.tar.gz');
  console.log('==> Packaging api + web...');
  execSync(
    `tar -czf "${tarPath}" --exclude=node_modules --exclude=.git --exclude=web/.next --exclude=api/dist --exclude=api/prisma/dev.db --exclude=api/.env --exclude=web/.env.local --exclude=desktop/src-tauri/target --exclude=dist -C "${ROOT}" api web desktop deploy/deploy-rebuild.sh deploy/ensure-local-media.sh deploy/nginx/itestu.uz.conf deploy/generate-tauri-icons.mjs deploy/build-tauri-desktop.mjs deploy/build-linux-on-vps.mjs deploy/upload-desktop-release.mjs deploy/build-windows-installer.mjs`,
    { stdio: 'inherit' },
  );

  const conn = new Client();
  await new Promise((r, j) => conn.on('ready', r).on('error', j).connect(VPS));
  const sftp = await new Promise((r, j) =>
    conn.sftp((e, s) => (e ? j(e) : r(s))),
  );

  console.log(`==> Uploading to ${VPS.host}...`);
  await exec(conn, 'mkdir -p /var/www/itestu/deploy/env');
  for (const [localRel, remote] of [
    ['deploy/env/api.env', '/var/www/itestu/deploy/env/api.env'],
    ['deploy/env/web.env.local', '/var/www/itestu/deploy/env/web.env.local'],
  ]) {
    const localPath = join(ROOT, localRel);
    if (existsSync(localPath)) {
      console.log(`==> Uploading ${localRel}...`);
      await upload(sftp, localPath, remote);
    }
  }
  await upload(sftp, tarPath, '/var/www/itestu/production.tar.gz');

  const freshPackages = process.env.FRESH_PACKAGES === '1' ? '1' : '';

  await exec(conn, `
set -e
cd /var/www/itestu/app
tar -xzf /var/www/itestu/production.tar.gz
rm /var/www/itestu/production.tar.gz
# Remove files deleted in refactors (tar extract does not delete stale paths)
rm -f web/src/components/teacher/availability/availability-grid.tsx \\
  web/src/components/teacher/availability/availability-header.tsx \\
  web/src/components/teacher/availability/working-hours-dialog.tsx \\
  web/src/components/teacher/speaking/speaking-empty-state.tsx \\
  web/src/components/teacher/grading/grading-header.tsx \\
  web/src/components/teacher/grading/submissions-table.tsx \\
  web/src/components/teacher/grading/grading-queue-empty.tsx \\
  web/src/components/marketing/shared/trust-marquee.tsx \\
  web/src/components/marketing/shared/center-logo.tsx
mkdir -p /var/www/itestu/deploy/nginx
for f in deploy-rebuild.sh ensure-local-media.sh; do
  if [ -f "/var/www/itestu/app/deploy/$f" ]; then
    cp "/var/www/itestu/app/deploy/$f" "/var/www/itestu/deploy/$f"
    sed -i 's/\\r$//' "/var/www/itestu/deploy/$f"
    chmod +x "/var/www/itestu/deploy/$f"
  fi
done
if [ -f /var/www/itestu/app/deploy/nginx/itestu.uz.conf ]; then
  cp /var/www/itestu/app/deploy/nginx/itestu.uz.conf /var/www/itestu/deploy/nginx/itestu.uz.conf
  cp /var/www/itestu/deploy/nginx/itestu.uz.conf /etc/nginx/sites-available/itestu.uz
  nginx -t && systemctl reload nginx
fi
bash /var/www/itestu/deploy/deploy-rebuild.sh
cd /var/www/itestu/app/api
if [ "${SEED_MOCK_CONTENT:-0}" = "1" ]; then
  npm run packages:ensure-skill
  npm run sync:exam-content
  npm run content:patch
  npm run content:repair-mocks
  npm run content:fix-conflicts || true
  npm run content:migrate-names
else
  echo "Skipping bundled mock content seed (SEED_MOCK_CONTENT!=1)."
fi
npm run enrollments:backfill-cutoff
npm run settings:migrate-day-cutoff
cd /var/www/itestu/app/api && npx tsx scripts/migrate-teacher-rates.ts || true
if [ "${freshPackages}" = "1" ]; then
  npm run packages:clear -- --confirm
fi
`);

  console.log('\\n==> Public checks...');
  await exec(conn, `
curl -sf -o /dev/null -w "health:%{http_code} " https://${DOMAIN}/api/v1/health || echo "health:FAIL "
curl -sf -o /dev/null -w "home:%{http_code} " https://${DOMAIN}/ || echo "home:FAIL "
curl -sf -o /dev/null -w "catalog:%{http_code}\\n" https://${DOMAIN}/api/v1/catalog/packages || echo "catalog:FAIL"
`);

  conn.end();
  console.log('\\nProduction deploy finished.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
