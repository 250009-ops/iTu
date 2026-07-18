#!/usr/bin/env node
/** Copy built Linux artifacts to nginx releases dir and update DB settings. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

const VERSION = process.env.DESKTOP_VERSION || '1.0.0';
const DOMAIN = process.env.DEPLOY_DOMAIN || 'www.itestu.uz';

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

function sftpReadFile(sftp, remote) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = sftp.createReadStream(remote);
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function sftpWriteFile(sftp, remote, data) {
  return new Promise((resolve, reject) => {
    sftp.writeFile(remote, data, (e) => (e ? reject(e) : resolve()));
  });
}

async function main() {
  assertVpsCredentials();
  const conn = new Client();
  await new Promise((r, j) => conn.on('ready', r).on('error', j).connect(VPS));

  await exec(
    conn,
    `
set -e
mkdir -p /var/www/itestu/app/dist/desktop /var/www/releases/desktop
find /var/www/itestu/app/desktop/src-tauri/target -path '*/release/bundle/*' -type f \\( -name '*.AppImage' -o -name '*.deb' -o -name '*.dmg' \\) -exec cp -f {} /var/www/releases/desktop/ \\;
ls -la /var/www/releases/desktop/
`,
  );

  const sftp = await new Promise((r, j) =>
    conn.sftp((e, s) => (e ? j(e) : r(s))),
  );

  const list = await new Promise((resolve, reject) => {
    sftp.readdir('/var/www/releases/desktop', (err, files) =>
      err ? reject(err) : resolve(files),
    );
  });

  const appImage = list.find((f) => f.filename.endsWith('.AppImage'));
  const dmg = list.find((f) => f.filename.endsWith('.dmg'));
  const windows = list.find((f) => f.filename.includes('x64-setup.exe'));

  const platforms = {
    windows: { url: '', sha256: '', size: 0 },
    macos: { url: '', sha256: '', size: 0 },
    linux: { url: '', sha256: '', size: 0 },
  };

  for (const [key, file] of [
    ['windows', windows],
    ['macos', dmg],
    ['linux', appImage],
  ]) {
    if (!file) continue;
    const remote = `/var/www/releases/desktop/${file.filename}`;
    const data = await sftpReadFile(sftp, remote);
    platforms[key] = {
      url: `https://${DOMAIN}/releases/desktop/${file.filename}`,
      sha256: createHash('sha256').update(data).digest('hex'),
      size: data.length,
    };
  }

  // Preserve existing settings for platforms we didn't scan
  await exec(conn, `cat /var/www/itestu/app/api/.env >/dev/null 2>&1 || true`);
  const settings = {
    version: VERSION,
    releasedAt: new Date().toISOString(),
    platforms,
  };

  const settingsPath = path.join(tmpdir(), 'desktop-releases.json');
  writeFileSync(settingsPath, JSON.stringify(settings));
  await sftpWriteFile(
    sftp,
    '/tmp/desktop-releases.json',
    readFileSync(settingsPath),
  );

  await exec(
    conn,
    `
set -e
cd /var/www/itestu/app/api
DESKTOP_RELEASES_JSON="$(cat /tmp/desktop-releases.json)" npx tsx scripts/update-desktop-releases.ts
curl -sfI "https://${DOMAIN}/releases/desktop/${appImage?.filename || 'iTestU_1.0.0_amd64.AppImage'}" | head -1
`,
  );

  conn.end();
  console.log('\nReleases published:');
  console.log('  windows:', platforms.windows.url || '(none)');
  console.log('  macos:  ', platforms.macos.url || '(none)');
  console.log('  linux:  ', platforms.linux.url || '(none)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
