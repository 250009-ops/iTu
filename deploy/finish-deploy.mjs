#!/usr/bin/env node
import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "ssh2";

const VPS = {
  host: "170.168.6.42",
  username: "root",
  password: "WpQnJrT0k8eKjOli",
  port: 22,
};

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

  const deploy = join(import.meta.dirname);
  await upload(sftp, join(deploy, "ecosystem.config.cjs"), "/var/www/itestu/app/ecosystem.config.cjs");
  await upload(
    sftp,
    join(deploy, "nginx/itestu.uz.bootstrap.conf"),
    "/etc/nginx/sites-available/itestu.uz",
  );

  await exec(conn, `
set -e
pm2 delete itestu-api itestu-web 2>/dev/null || true
cd /var/www/itestu/app && pm2 start ecosystem.config.cjs
pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root | tail -1 | bash || true
ln -sf /etc/nginx/sites-available/itestu.uz /etc/nginx/sites-enabled/itestu.uz
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
sleep 3
curl -sf http://127.0.0.1:3001/api/v1/catalog/packages | head -c 120 || echo API_CHECK_FAILED
curl -sf -o /dev/null -w "WEB:%{http_code}" http://127.0.0.1:3000 || echo WEB_CHECK_FAILED
curl -sf -o /dev/null -w "IP:%{http_code}" http://127.0.0.1/ || echo IP_CHECK_FAILED
pm2 status
`);

  try {
    await exec(conn, "bash /var/www/itestu/deploy/setup-ssl.sh");
    await upload(
      sftp,
      join(deploy, "nginx/itestu.uz.conf"),
      "/etc/nginx/sites-available/itestu.uz",
    );
    await exec(conn, "nginx -t && systemctl reload nginx");
  } catch (e) {
    console.warn("SSL setup:", e.message);
  }

  conn.end();
  console.log("\nFinish deploy complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
