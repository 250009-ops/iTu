#!/usr/bin/env node
/** Hotfix deploy — upload source, rebuild api + web, restart PM2 (preserves server .env) */
import { readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { Client } from "ssh2";
import { VPS, assertVpsCredentials } from "./lib/vps.js";

const ROOT = join(import.meta.dirname, "..");
const DOMAIN = process.env.DEPLOY_DOMAIN || "itestu.uz";

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
  assertVpsCredentials();
  const tarPath = join(tmpdir(), "itestu-hotfix.tar.gz");
  execSync(
    `tar -czf "${tarPath}" --exclude=node_modules --exclude=.git --exclude=web/.next --exclude=api/dist --exclude=deploy/node_modules --exclude=api/prisma/dev.db --exclude=api/.env --exclude=web/.env.local -C "${ROOT}" api web deploy/deploy-rebuild.sh deploy/nginx/itestu.uz.conf`,
    { stdio: "inherit" },
  );

  const conn = new Client();
  await new Promise((r, j) => conn.on("ready", r).on("error", j).connect(VPS));
  const sftp = await new Promise((r, j) => conn.sftp((e, s) => (e ? j(e) : r(s))));

  console.log("Uploading hotfix...");
  await upload(sftp, tarPath, "/var/www/itestu/hotfix.tar.gz");

  await exec(conn, `
set -e
cd /var/www/itestu/app
tar -xzf /var/www/itestu/hotfix.tar.gz
rm /var/www/itestu/hotfix.tar.gz
if [ -f /var/www/itestu/app/deploy/deploy-rebuild.sh ]; then
  cp /var/www/itestu/app/deploy/deploy-rebuild.sh /var/www/itestu/deploy/deploy-rebuild.sh
  sed -i 's/\r$//' /var/www/itestu/deploy/deploy-rebuild.sh
  chmod +x /var/www/itestu/deploy/deploy-rebuild.sh
fi
if [ -f /var/www/itestu/app/deploy/nginx/itestu.uz.conf ]; then
  mkdir -p /var/www/itestu/deploy/nginx
  cp /var/www/itestu/app/deploy/nginx/itestu.uz.conf /var/www/itestu/deploy/nginx/itestu.uz.conf
fi
bash /var/www/itestu/deploy/deploy-rebuild.sh
`);

  conn.end();
  console.log("Hotfix deployed.");
}

main().catch((e) => { console.error(e); process.exit(1); });
