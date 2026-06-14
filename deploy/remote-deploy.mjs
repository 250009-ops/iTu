#!/usr/bin/env node
/**
 * Remote deployment helper — uploads env + deploy files and runs bootstrap on VPS.
 * Usage: node deploy/remote-deploy.mjs
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { Client } from "ssh2";

const VPS = {
  host: process.env.VPS_HOST || "170.168.6.42",
  username: process.env.VPS_USER || "root",
  password: process.env.VPS_PASSWORD || "WpQnJrT0k8eKjOli",
  port: 22,
};

const ROOT = join(import.meta.dirname, "..");
const DEPLOY = join(ROOT, "deploy");

function collectFiles(dir, base = dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "env" && dir.endsWith("deploy")) {
        for (const envName of ["api.env", "web.env.local", "postgres.env"]) {
          files.push({ local: join(full, envName), remote: `/var/www/itestu/deploy/env/${envName}` });
        }
        continue;
      }
      files.push(...collectFiles(full, base));
    } else if (!name.endsWith(".mjs")) {
      const rel = relative(DEPLOY, full).replace(/\\/g, "/");
      files.push({ local: full, remote: `/var/www/itestu/deploy/${rel}` });
    }
  }
  return files;
}

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      let errOut = "";
      stream.on("data", (d) => {
        out += d.toString();
        process.stdout.write(d);
      });
      stream.stderr.on("data", (d) => {
        errOut += d.toString();
        process.stderr.write(d);
      });
      stream.on("close", (code) => {
        if (code === 0) resolve(out);
        else reject(new Error(`Command failed (${code}): ${cmd}\n${errOut}`));
      });
    });
  });
}

function uploadSftp(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    const content = readFileSync(local);
    const dir = remote.substring(0, remote.lastIndexOf("/"));
    sftp.mkdir(dir, { mode: 0o755 }, () => {
      sftp.writeFile(remote, content, (err) => (err ? reject(err) : resolve()));
    });
  });
}

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn
      .on("ready", resolve)
      .on("error", reject)
      .connect(VPS);
  });

  console.log(`Connected to ${VPS.host} as ${VPS.username}`);

  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => (err ? reject(err) : resolve(s)));
  });

  await exec(conn, "mkdir -p /var/www/itestu/deploy/env /var/log/itestu");

  const files = collectFiles(DEPLOY);
  for (const { local, remote } of files) {
    console.log(`Upload: ${remote}`);
    await uploadSftp(sftp, local, remote);
  }

  await exec(conn, "chmod +x /var/www/itestu/deploy/*.sh");

  console.log("\n=== Running bootstrap ===");
  await exec(conn, "bash /var/www/itestu/deploy/bootstrap.sh");

  console.log("\n=== Running deploy ===");
  await exec(conn, "bash /var/www/itestu/deploy/deploy-app.sh");

  console.log("\n=== Checking DNS / SSL ===");
  try {
    await exec(
      conn,
      "bash /var/www/itestu/deploy/setup-ssl.sh",
    );
  } catch (e) {
    console.warn("\nSSL setup skipped or failed (DNS may not be ready yet):", e.message);
  }

  console.log("\n=== Health check ===");
  try {
    await exec(conn, "curl -sf http://127.0.0.1:3001/api/v1/catalog/packages | head -c 200");
    await exec(conn, "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:3000");
  } catch (e) {
    console.warn("Health check warning:", e.message);
  }

  conn.end();
  console.log("\nDeployment finished.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
