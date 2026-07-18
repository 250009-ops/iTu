#!/usr/bin/env node
/**
 * Upload desktop release artifacts to VPS and update platform settings.
 *
 * Usage:
 *   VPS_PASSWORD=... node deploy/upload-desktop-release.mjs
 *   VPS_PASSWORD=... node deploy/upload-desktop-release.mjs path/to/iTestU_1.0.0_x64-setup.exe
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REMOTE_DIR = '/var/www/releases/desktop';
const VERSION = process.env.DESKTOP_VERSION || '1.0.0';
const DEFAULT_ARTIFACT = path.join(
  ROOT,
  'dist',
  'desktop',
  `iTestU_${VERSION}_x64-setup.exe`,
);

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

  const localPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_ARTIFACT;

  if (!existsSync(localPath)) {
    console.error(`Artifact not found: ${localPath}`);
    console.error('Run: node deploy/build-windows-installer.mjs');
    process.exit(1);
  }

  const fileName = path.basename(localPath);
  const bytes = readFileSync(localPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const size = statSync(localPath).size;
  const domain = process.env.DEPLOY_DOMAIN || 'www.itestu.uz';
  const url = `https://${domain}/releases/desktop/${fileName}`;

  console.log(
    `==> Uploading ${fileName} (${size} bytes, sha256 ${sha256.slice(0, 12)}…)`,
  );

  const conn = new Client();
  await new Promise((r, j) => conn.on('ready', r).on('error', j).connect(VPS));
  const sftp = await new Promise((r, j) =>
    conn.sftp((e, s) => (e ? j(e) : r(s))),
  );

  await exec(conn, `mkdir -p ${REMOTE_DIR}`);
  await upload(sftp, localPath, `${REMOTE_DIR}/${fileName}`);

  await exec(
    conn,
    `
set -e
cd /var/www/itestu/app/api
DESKTOP_RELEASE_URL='${url}' \\
DESKTOP_RELEASE_SHA256='${sha256}' \\
DESKTOP_RELEASE_SIZE='${size}' \\
DESKTOP_VERSION='${VERSION}' \\
npx tsx scripts/update-desktop-releases.ts
curl -sfI '${url}' | head -1 || echo 'WARN: HEAD check failed'
`,
  );

  conn.end();
  console.log('\nDesktop release uploaded and settings updated.');
  console.log('URL:', url);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
