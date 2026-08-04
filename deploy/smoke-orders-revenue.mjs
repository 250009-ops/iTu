import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

assertVpsCredentials();

const remote = `
cd /var/www/itestu/app/api && node <<'NODE'
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const raw = process.env.REVENUE_STATS_SINCE;
  const since = raw && raw.trim() ? new Date(raw.trim()) : null;
  console.log('ENV', raw || '(unset)');
  console.log('SINCE_UTC', since ? since.toISOString() : null);

  const paid = await p.order.findMany({
    where: {
      status: 'PAID',
      paymentMethod: { not: 'COMPLIMENTARY' },
      amount: { gt: 0 },
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    select: { orderCode: true, amount: true, createdAt: true },
  });
  const refunded = await p.order.count({
    where: {
      status: 'REFUNDED',
      ...(since ? { createdAt: { gte: since } } : {}),
    },
  });
  const failed = await p.order.count({
    where: {
      status: 'FAILED',
      ...(since ? { createdAt: { gte: since } } : {}),
    },
  });
  const sum = paid.reduce((s, o) => s + o.amount, 0);
  console.log('SMOKE', JSON.stringify({
    paidOrders: paid.length,
    revenueCollected: sum,
    refundsIssued: refunded,
    failedPayments: failed,
    paidCodes: paid.map((o) => o.orderCode),
  }, null, 2));
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
NODE
`;

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(remote, (err, stream) => {
      if (err) throw err;
      let out = '';
      stream.on('data', (d) => {
        out += d.toString();
      });
      stream.stderr.on('data', (d) => {
        out += d.toString();
      });
      stream.on('close', (code) => {
        console.log(out.trim());
        conn.end();
        process.exit(code || 0);
      });
    });
  })
  .connect({
    host: VPS.host,
    port: VPS.port,
    username: VPS.username,
    password: VPS.password,
  });
