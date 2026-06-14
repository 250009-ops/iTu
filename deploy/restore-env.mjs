#!/usr/bin/env node
import { Client } from "ssh2";
const VPS = { host: "170.168.6.42", username: "root", password: "WpQnJrT0k8eKjOli", port: 22 };
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
async function main() {
  const conn = new Client();
  await new Promise((r, j) => conn.on("ready", r).on("error", j).connect(VPS));
  await exec(conn, `
cp /var/www/itestu/deploy/env/api.env /var/www/itestu/app/api/.env
cp /var/www/itestu/deploy/env/web.env.local /var/www/itestu/app/web/.env.local
pm2 restart itestu-api itestu-web
sleep 4
curl -sf -o /dev/null -w "API:%{http_code}\\n" https://donish.live/api/v1/catalog/packages
head -3 /var/www/itestu/app/api/.env
`);
  conn.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
