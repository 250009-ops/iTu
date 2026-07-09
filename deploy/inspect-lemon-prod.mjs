import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', (d) => (out += d));
      stream.stderr.on('data', (d) => process.stderr.write(d));
      stream.on('close', (c) => (c === 0 ? resolve(out) : reject(new Error(out || `exit ${c}`))));
    });
  });
}

const conn = new Client();
await new Promise((r, j) => conn.on('ready', r).on('error', j).connect(VPS));

const script = `
cd /var/www/itestu/app/api && npx tsx scripts/inspect-recent-orders.ts
`;
const orders = await exec(conn, script);
console.log(orders);
conn.end();
