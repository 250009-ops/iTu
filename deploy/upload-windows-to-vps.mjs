#!/usr/bin/env node
/** Upload local dist/desktop/iTestU_*_x64-setup.exe to VPS releases dir. */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist', 'desktop');

async function main() {
  assertVpsCredentials();
  const exe = readdirSync(dist).find((f) => /x64-setup\.exe$/i.test(f));
  if (!exe) throw new Error('No Windows setup exe in dist/desktop');
  const local = path.join(dist, exe);
  console.log(`Uploading ${exe} (${readFileSync(local).length} bytes)…`);

  const conn = new Client();
  await new Promise((r, j) => conn.on('ready', r).on('error', j).connect(VPS));
  const sftp = await new Promise((r, j) =>
    conn.sftp((e, s) => (e ? j(e) : r(s))),
  );
  await new Promise((r, j) =>
    sftp.writeFile(
      `/var/www/releases/desktop/${exe}`,
      readFileSync(local),
      (e) => (e ? j(e) : r()),
    ),
  );
  conn.end();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
