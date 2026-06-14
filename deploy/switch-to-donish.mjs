#!/usr/bin/env node
/** Switch production to donish.live — update env, rebuild web, nginx, SSL */
import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "ssh2";

const VPS = {
  host: process.env.VPS_HOST || "170.168.6.42",
  username: process.env.VPS_USER || "root",
  password: process.env.VPS_PASSWORD || "WpQnJrT0k8eKjOli",
  port: 22,
};

const DEPLOY = join(import.meta.dirname);

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let errOut = "";
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => {
        errOut += d.toString();
        process.stderr.write(d);
      });
      stream.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`${cmd}\n${errOut}`)),
      );
    });
  });
}

function upload(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.writeFile(remote, readFileSync(local), (err) =>
      err ? reject(err) : resolve(),
    );
  });
}

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on("ready", resolve).on("error", reject).connect(VPS);
  });
  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => (err ? reject(err) : resolve(s)));
  });

  const uploads = [
    [join(DEPLOY, "env/api.env"), "/var/www/itestu/deploy/env/api.env"],
    [join(DEPLOY, "env/web.env.local"), "/var/www/itestu/deploy/env/web.env.local"],
    [join(DEPLOY, "nginx/donish.live.bootstrap.conf"), "/var/www/itestu/deploy/nginx/donish.live.bootstrap.conf"],
    [join(DEPLOY, "nginx/donish.live.conf"), "/var/www/itestu/deploy/nginx/donish.live.conf"],
    [join(DEPLOY, "setup-donish-ssl.sh"), "/var/www/itestu/deploy/setup-donish-ssl.sh"],
  ];

  for (const [local, remote] of uploads) {
    console.log(`Upload: ${remote}`);
    await upload(sftp, local, remote);
  }

  await exec(conn, `
set -e
chmod +x /var/www/itestu/deploy/setup-donish-ssl.sh

cp /var/www/itestu/deploy/env/api.env /var/www/itestu/app/api/.env
cp /var/www/itestu/deploy/env/web.env.local /var/www/itestu/app/web/.env.local

echo "==> Rebuilding web for donish.live..."
cd /var/www/itestu/app/web
npm run build

echo "==> Restarting API (CORS) and web..."
pm2 restart itestu-api itestu-web

echo "==> Nginx bootstrap for donish.live..."
cp /var/www/itestu/deploy/nginx/donish.live.bootstrap.conf /etc/nginx/sites-available/donish.live
ln -sf /etc/nginx/sites-available/donish.live /etc/nginx/sites-enabled/donish.live
nginx -t && systemctl reload nginx

echo "==> HTTP check..."
curl -sf -o /dev/null -w "HTTP:%{http_code} " -H "Host: donish.live" http://127.0.0.1/
curl -sf -H "Host: donish.live" http://127.0.0.1/api/v1/catalog/packages | head -c 80
echo ""
`);

  console.log("\n==> SSL for donish.live...");
  try {
    await exec(conn, "bash /var/www/itestu/deploy/setup-donish-ssl.sh");
  } catch (e) {
    console.warn("SSL failed:", e.message);
  }

  await exec(conn, `
curl -sf -o /dev/null -w "HTTPS:%{http_code} " https://donish.live/ || true
curl -sf https://donish.live/api/v1/catalog/packages | head -c 80 || true
echo ""
pm2 status
`);

  conn.end();
  console.log("\nDone — https://donish.live");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
