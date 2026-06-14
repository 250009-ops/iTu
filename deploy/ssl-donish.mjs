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
  await upload(sftp, join(DEPLOY, "nginx/donish.live.conf"), "/var/www/itestu/deploy/nginx/donish.live.conf");
  await upload(sftp, join(DEPLOY, "setup-donish-ssl.sh"), "/var/www/itestu/deploy/setup-donish-ssl.sh");
  await exec(conn, "chmod +x /var/www/itestu/deploy/setup-donish-ssl.sh && bash /var/www/itestu/deploy/setup-donish-ssl.sh");
  await exec(conn, "curl -sf -o /dev/null -w 'HTTPS:%{http_code}\\n' https://donish.live/");
  conn.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
