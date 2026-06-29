import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

assertVpsCredentials();

const apiUrl = process.env.API_URL || 'https://itestu.uz';

async function checkLocalHealth() {
  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/v1/health`);
    const body = await res.json();
    console.log(`Health (${apiUrl}):`, JSON.stringify(body, null, 2));
    if (!res.ok || body.status !== 'ok') {
      return false;
    }
    return true;
  } catch (err) {
    console.error('Health check failed:', err.message);
    return false;
  }
}

function runRemoteVerify() {
  return new Promise((resolve, reject) => {
    const remoteScript = `
cd /var/www/itestu/app/api && API_URL=${apiUrl} npm run verify:production
`;
    const conn = new Client();
    conn
      .on('ready', () => {
        conn.exec(remoteScript, (err, stream) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }
          stream.on('data', (d) => process.stdout.write(d));
          stream.stderr.on('data', (d) => process.stderr.write(d));
          stream.on('close', (code) => {
            conn.end();
            if (code === 0) resolve(undefined);
            else reject(new Error(`Remote verify exited with code ${code}`));
          });
        });
      })
      .on('error', reject)
      .connect({
        host: VPS.host,
        username: VPS.username,
        password: VPS.password,
        port: VPS.port,
      });
  });
}

async function main() {
  console.log('Checking public API health…');
  const healthy = await checkLocalHealth();
  if (!healthy) {
    process.exit(1);
  }

  console.log('\nRunning database audit on VPS…');
  await runRemoteVerify();
  console.log('\nProduction verification complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
