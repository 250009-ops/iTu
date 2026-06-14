#!/usr/bin/env node
import { Client } from "ssh2";
const VPS = { host: "170.168.6.42", username: "root", password: "WpQnJrT0k8eKjOli", port: 22 };
function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => { out += d; process.stdout.write(d); });
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", () => resolve(out));
    });
  });
}
async function main() {
  const conn = new Client();
  await new Promise((r, j) => conn.on("ready", r).on("error", j).connect(VPS));
  await exec(conn, `
echo "=== sites-enabled ==="
ls -la /etc/nginx/sites-enabled/
echo "=== grep donish ==="
grep -r donish /etc/nginx/ 2>/dev/null || true
echo "=== grep server_name ==="
grep -r "server_name" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null || true
`);
  conn.end();
}
main();
