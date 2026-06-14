#!/usr/bin/env node
import { Client } from "ssh2";
const VPS = { host: "170.168.6.42", username: "root", password: "WpQnJrT0k8eKjOli", port: 22 };
function exec(conn, cmd) {
  return new Promise((resolve) => {
    conn.exec(cmd, (err, stream) => {
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", () => resolve());
    });
  });
}
async function main() {
  const conn = new Client();
  await new Promise((r, j) => conn.on("ready", r).on("error", j).connect(VPS));
  await exec(conn, `
echo "=== direct app ==="
curl -sf -o /dev/null -w "web:%{http_code} " http://127.0.0.1:3000/
curl -sf -o /dev/null -w "api:%{http_code}\\n" http://127.0.0.1:3001/api/v1/catalog/packages
echo "=== nginx donish ==="
curl -sv -H "Host: donish.live" http://127.0.0.1/ 2>&1 | tail -5
echo "=== sites-enabled ==="
ls -la /etc/nginx/sites-enabled/
cat /etc/nginx/sites-available/donish.live
pm2 status
`);
  conn.end();
}
main();
