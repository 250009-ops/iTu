#!/usr/bin/env node
/** Upload latest fix script and run on VPS. */
import { readFileSync } from 'node:fs';
import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

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
  await new Promise((r, j) => conn.on('ready', r).on('error', j).connect(VPS));
  const sftp = await new Promise((r, j) =>
    conn.sftp((e, s) => (e ? j(e) : r(s))),
  );
  await new Promise((r, j) =>
    sftp.writeFile(
      '/var/www/itestu/app/api/scripts/fix-exclusive-content-conflicts.ts',
      readFileSync('../api/scripts/fix-exclusive-content-conflicts.ts'),
      (e) => (e ? j(e) : r()),
    ),
  );
  await exec(conn, 'cd /var/www/itestu/app/api && npm run content:fix-conflicts');
  conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
