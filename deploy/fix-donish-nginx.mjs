#!/usr/bin/env node
import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "ssh2";

const VPS = { host: "170.168.6.42", username: "root", password: "WpQnJrT0k8eKjOli", port: 22 };
const DEPLOY = join(import.meta.dirname);

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
  const conn = new Client();
  await new Promise((r, j) => conn.on("ready", r).on("error", j).connect(VPS));
  const sftp = await new Promise((r, j) => conn.sftp((e, s) => (e ? j(e) : r(s))));

  await upload(sftp, join(DEPLOY, "nginx/donish.live.bootstrap.conf"), "/etc/nginx/sites-available/donish.live");
  await upload(sftp, join(DEPLOY, "nginx/donish.live.conf"), "/var/www/itestu/deploy/nginx/donish.live.conf");
  await upload(sftp, join(DEPLOY, "setup-donish-ssl.sh"), "/var/www/itestu/deploy/setup-donish-ssl.sh");

  await exec(conn, `
set -e
chmod +x /var/www/itestu/deploy/setup-donish-ssl.sh

# Remove old static donish site that blocked itestu ERP
rm -f /etc/nginx/sites-enabled/donish-site.conf
mv /etc/nginx/sites-enabled/donish-site.conf /etc/nginx/sites-available/donish-site.conf.bak 2>/dev/null || true
mv /etc/nginx/sites-available/donish-site.conf /etc/nginx/sites-available/donish-site.conf.bak 2>/dev/null || true

rm -f /etc/nginx/sites-enabled/itestu.uz /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/donish.live /etc/nginx/sites-enabled/donish.live

nginx -t
systemctl reload nginx

curl -sf -o /dev/null -w "HTTP:%{http_code}\\n" -H "Host: donish.live" http://127.0.0.1/
curl -sf -H "Host: donish.live" http://127.0.0.1/api/v1/catalog/packages | head -c 120
echo ""
`);

  console.log("\n==> SSL...");
  await exec(conn, "bash /var/www/itestu/deploy/setup-donish-ssl.sh");

  await exec(conn, `
curl -sf -o /dev/null -w "HTTPS:%{http_code}\\n" https://donish.live/
curl -sf https://donish.live/api/v1/catalog/packages | head -c 120
echo ""
pm2 status
`);

  conn.end();
  console.log("\nhttps://donish.live is live.");
}

main().catch((e) => { console.error(e); process.exit(1); });
