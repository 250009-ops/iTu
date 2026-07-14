#!/usr/bin/env node
/**
 * Merge Telegram onboarding-bot config from local api/.env into the production
 * vault. Preserves every other server var (reads the live server env as base).
 * Does not commit secrets — deploy/env/api.env stays gitignored.
 *
 *   VPS_PASSWORD=... node deploy/sync-telegram-env.mjs
 */
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
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

function normaliseUsername(raw) {
  return (raw || '')
    .trim()
    .replace(/^https?:\/\/t\.me\//i, '')
    .replace(/^t\.me\//i, '')
    .replace(/^@/, '')
    .replace(/\/+$/, '');
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
  const token = local.TELEGRAM_BOT_TOKEN?.trim();
  const username = normaliseUsername(local.TELEGRAM_BOT_USERNAME);
  if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN in api/.env');
  if (!username) throw new Error('Set TELEGRAM_BOT_USERNAME in api/.env');

  const conn = new Client();
  await new Promise((r, j) => conn.on('ready', r).on('error', j).connect(VPS));

  let baseText = '';
  try {
    baseText = await new Promise((resolve, reject) => {
      conn.exec('cat /var/www/itestu/deploy/env/api.env', (err, stream) => {
        if (err) return reject(err);
        let data = '';
        stream.on('data', (d) => (data += d));
        stream.on('close', (c) =>
          c === 0 ? resolve(data) : reject(new Error('no vault')),
        );
      });
    });
  } catch {
    if (existsSync(VAULT)) baseText = readFileSync(VAULT, 'utf8');
  }

  const server = parseEnv(baseText);
  // Stable webhook secret: prefer local, else keep existing server one, else generate.
  const webhookSecret =
    local.TELEGRAM_WEBHOOK_SECRET?.trim() ||
    server.TELEGRAM_WEBHOOK_SECRET?.trim() ||
    randomBytes(24).toString('hex');

  let lines = baseText.split('\n');
  lines = upsertLine(lines, 'TELEGRAM_BOT_TOKEN', token);
  lines = upsertLine(lines, 'TELEGRAM_BOT_USERNAME', username);
  lines = upsertLine(lines, 'TELEGRAM_WEBHOOK_SECRET', webhookSecret);
  lines = upsertLine(lines, 'TELEGRAM_POLLING', 'false');
  lines = upsertLine(lines, 'TELEGRAM_WEBHOOK_BASE_URL', PRODUCTION_APP_URL);

  const merged = lines
    .filter((l, i, arr) => l !== '' || i < arr.length - 1)
    .join('\n');
  writeFileSync(VAULT, merged.endsWith('\n') ? merged : `${merged}\n`);
  console.log(`==> Wrote ${VAULT} (gitignored)`);

  const sftp = await new Promise((r, j) =>
    conn.sftp((e, s) => (e ? j(e) : r(s))),
  );
  await upload(sftp, VAULT, '/var/www/itestu/deploy/env/api.env');
  await exec(
    conn,
    'cp /var/www/itestu/deploy/env/api.env /var/www/itestu/app/api/.env',
  );
  console.log('==> Telegram env synced to VPS vault');
  conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
