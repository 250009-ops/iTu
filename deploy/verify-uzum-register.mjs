#!/usr/bin/env node
import { Client } from 'ssh2';
import { assertVpsCredentials, VPS } from './lib/vps.js';

const remoteScript = `cd /var/www/itestu/app/api && node <<'NODE'
const https = require('https');
const fs = require('fs');
const parseEnv = (raw) =>
  Object.fromEntries(
    raw
      .split(/\\n/)
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        const key = l.slice(0, i);
        let val = l.slice(i + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        return [key, val];
      }),
  );
const env = parseEnv(fs.readFileSync('.env', 'utf8'));
const body = JSON.stringify({
  amount: 5600000,
  clientId: 'deploy-test-client',
  currency: 860,
  paymentDetails: 'Deploy verify',
  successUrl: 'https://www.itestu.uz/student/mock-day?payment=success',
  failureUrl: 'https://www.itestu.uz/student/browse?payment=failed',
  orderNumber: 'ORD-DEPLOY-TEST-' + Date.now(),
  sessionTimeoutSecs: 900,
  viewType: 'REDIRECT',
  paymentParams: { payType: 'ONE_STEP' },
  merchantParams: {
    cart: {
      cartId: 'ORD-DEPLOY-TEST',
      receiptType: 'PURCHASE',
      total: 5600000,
      items: [
        {
          title: 'Full Academic Mock',
          productId: '00000000-0000-0000-0000-000000000099',
          quantity: 1,
          unitPrice: 5600000,
          total: 5600000,
          receiptParams: {
            spic: env.UZUM_CHECKOUT_IKPU_SPIC,
            packageCode: env.UZUM_CHECKOUT_PACKAGE_CODE,
            vatPercent: 0,
            PINFL: env.UZUM_CHECKOUT_MERCHANT_PINFL,
          },
        },
      ],
    },
  },
});
const base = env.UZUM_CHECKOUT_BASE_URL || 'https://test-chk-api.uzumcheckout.uz';
const url = new URL(base + '/api/v1/payment/register');
const req = https.request(
  url,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Language': env.UZUM_CHECKOUT_CONTENT_LANGUAGE || 'uz-UZ',
      'X-Terminal-Id': env.UZUM_CHECKOUT_TERMINAL_ID,
      'X-API-Key': env.UZUM_CHECKOUT_API_KEY,
      'Content-Length': Buffer.byteLength(body),
    },
  },
  (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => console.log('HTTP', res.statusCode, data));
  },
);
req.on('error', (e) => console.error('ERROR', e.message));
req.write(body);
req.end();
NODE`;

assertVpsCredentials();
const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(remoteScript, (err, stream) => {
      if (err) throw err;
      stream.on('data', (d) => process.stdout.write(d));
      stream.stderr.on('data', (d) => process.stderr.write(d));
      stream.on('close', (code) => {
        conn.end();
        process.exit(code ?? 0);
      });
    });
  })
  .connect(VPS);
