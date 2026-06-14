#!/usr/bin/env node
import { readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { Client } from "ssh2";

const VPS = { host: "170.168.6.42", username: "root", password: "WpQnJrT0k8eKjOli", port: 22 };
const DEPLOY = join(import.meta.dirname);
const ROOT = join(DEPLOY, "..");

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let errOut = "";
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => { errOut += d; process.stderr.write(d); });
      stream.on("close", (c) => (c === 0 ? resolve() : reject(new Error(errOut))));
    });
  });
}

function upload(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.writeFile(remote, readFileSync(local), (e) => (e ? reject(e) : resolve()));
  });
}

async function main() {
  const tarPath = join(tmpdir(), "itestu-web-fix.tar.gz");
  execSync(
    `tar -czf "${tarPath}" --exclude=node_modules --exclude=.next --exclude=.env.local -C "${ROOT}" web`,
    { stdio: "inherit" },
  );

  const conn = new Client();
  await new Promise((r, j) => conn.on("ready", r).on("error", j).connect(VPS));
  const sftp = await new Promise((r, j) => conn.sftp((e, s) => (e ? j(e) : r(s))));

  await upload(sftp, tarPath, "/var/www/itestu/web-fix.tar.gz");
  await upload(sftp, join(DEPLOY, "env/web.env.local"), "/var/www/itestu/deploy/env/web.env.local");
  await upload(sftp, join(DEPLOY, "ecosystem.config.cjs"), "/var/www/itestu/deploy/ecosystem.config.cjs");

  await exec(conn, `
set -e
cd /var/www/itestu/app
tar -xzf /var/www/itestu/web-fix.tar.gz
rm /var/www/itestu/web-fix.tar.gz
cp /var/www/itestu/deploy/env/web.env.local web/.env.local
cp /var/www/itestu/deploy/ecosystem.config.cjs ecosystem.config.cjs
cd web && npm run build
cd /var/www/itestu/app
pm2 delete itestu-web 2>/dev/null || true
pm2 start ecosystem.config.cjs --only itestu-web
pm2 save
curl -sf -o /dev/null -w "SITE:%{http_code} " https://donish.live/login
curl -sf -X POST https://donish.live/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin","password":"admin"}' | head -c 80
echo ""
`);

  conn.end();
  console.log("Web API URL fix deployed.");
}

main().catch((e) => { console.error(e); process.exit(1); });
