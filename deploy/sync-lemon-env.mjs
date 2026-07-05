#!/usr/bin/env node
/**
 * Merge Lemon Squeezy + APP_URL from local api/.env into production vault.
 * Does not commit secrets — deploy/env/api.env stays gitignored.
 */
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

const ROOT = join(import.meta.dirname, '..');
const LOCAL_ENV = join(ROOT, 'api', '.env');
const VAULT = join(import.meta.dirname, 'env', 'api.env');
const PRODUCTION_APP_URL = 'https://itestu.uz';

function parseEnv(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function upsertLine(lines, key, value) {
  const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
  const entry = `${key}=${JSON.stringify(value)}`;
  if (idx >= 0) lines[idx] = entry;
  else lines.push(entry);
  return lines;
}

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

  if (!existsSync(LOCAL_ENV)) {
    throw new Error(`Missing ${LOCAL_ENV}`);
  }

  const local = parseEnv(readFileSync(LOCAL_ENV, 'utf8'));
  const keys = [
    'LEMON_SQUEEZY_API_KEY',
    'LEMON_SQUEEZY_STORE_ID',
    'LEMON_SQUEEZY_WEBHOOK_SECRET',
    'LEMON_SQUEEZY_VARIANTS',
  ];

  for (const key of keys) {
    if (!local[key]?.trim()) {
      throw new Error(`Set ${key} in api/.env before deploying payments`);
    }
  }

  const conn = new Client();
  await new Promise((r, j) => conn.on('ready', r).on('error', j).connect(VPS));

  let baseText = '';
  try {
    baseText = await new Promise((resolve, reject) => {
      conn.exec('cat /var/www/itestu/deploy/env/api.env', (err, stream) => {
        if (err) return reject(err);
        let data = '';
        stream.on('data', (d) => (data += d));
        stream.on('close', (c) => (c === 0 ? resolve(data) : reject(new Error('no vault'))));
      });
    });
  } catch {
    if (existsSync(VAULT)) {
      baseText = readFileSync(VAULT, 'utf8');
    } else {
      baseText = readFileSync(join(import.meta.dirname, 'env', 'api.env.example'), 'utf8');
    }
  }

  let lines = baseText.split('\n');
  for (const key of keys) {
    lines = upsertLine(lines, key, local[key].trim());
  }
  lines = upsertLine(lines, 'APP_URL', PRODUCTION_APP_URL);

  const merged = lines.filter((l, i, arr) => l !== '' || i < arr.length - 1).join('\n');
  writeFileSync(VAULT, merged.endsWith('\n') ? merged : `${merged}\n`);
  console.log(`==> Wrote ${VAULT} (gitignored)`);

  const sftp = await new Promise((r, j) =>
    conn.sftp((e, s) => (e ? j(e) : r(s))),
  );
  await upload(sftp, VAULT, '/var/www/itestu/deploy/env/api.env');
  await exec(conn, 'cp /var/www/itestu/deploy/env/api.env /var/www/itestu/app/api/.env');
  console.log('==> Lemon Squeezy env synced to VPS vault');
  conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
