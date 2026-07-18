#!/usr/bin/env node
/**
 * Build Tauri Linux desktop on the VPS (requires desktop/ sources deployed).
 *
 *   VPS_PASSWORD=... node deploy/build-linux-on-vps.mjs
 */
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

  await exec(
    conn,
    `
set -e
export DEBIAN_FRONTEND=noninteractive
if ! command -v rustc >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi
source "$HOME/.cargo/env" 2>/dev/null || true
apt-get update -qq
apt-get install -y -qq libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf build-essential curl
cd /var/www/itestu/app
if [ ! -d desktop/package.json ]; then
  echo "desktop/ not found on VPS — include it in deploy tarball first"
  exit 1
fi
node deploy/generate-tauri-icons.mjs
cd desktop && npm ci
WEB_APP_URL=https://www.itestu.uz npm run build:linux
mkdir -p /var/www/itestu/app/dist/desktop
find src-tauri/target/release/bundle -type f \\( -name '*.AppImage' -o -name '*.deb' \\) -exec cp {} /var/www/itestu/app/dist/desktop/ \\;
ls -la /var/www/itestu/app/dist/desktop/
`,
  );

  conn.end();
  console.log('\nLinux desktop build complete on VPS.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
