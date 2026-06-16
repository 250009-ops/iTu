#!/usr/bin/env node
/**
 * Remote deployment helper — uploads env + deploy files and runs bootstrap on VPS.
 * Usage: node deploy/remote-deploy.mjs
 */
import { readFileSync, readdirSync, statSync, createReadStream } from "fs";
import { join, relative } from "path";
import { Client } from "ssh2";
import { execSync } from "child_process";
import { tmpdir } from "os";

const VPS = {
  host: process.env.VPS_HOST || "170.168.6.42",
  username: process.env.VPS_USER || "root",
  password: process.env.VPS_PASSWORD || '',
  port: 22,
};

const ROOT = join(import.meta.dirname, "..");
const DEPLOY = join(ROOT, "deploy");

const APP_EXCLUDES = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  ".git",
  "api/prisma/dev.db",
  "api/prisma/dev.db-journal",
  "deploy/node_modules",
  "web/test-results",
  "web/playwright-report",
]);

function shouldSkip(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  return [...APP_EXCLUDES].some(
    (ex) => normalized === ex || normalized.startsWith(`${ex}/`),
  );
}

function collectAppFiles(dir, base = dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(base, full).replace(/\\/g, "/");
    if (shouldSkip(rel)) continue;
    if (statSync(full).isDirectory()) {
      files.push(...collectAppFiles(full, base));
    } else if (!rel.startsWith("deploy/env/") && !rel.endsWith(".db")) {
      files.push({ local: full, remote: `/var/www/itestu/app/${rel}` });
    }
  }
  return files;
}

function collectFiles(dir, base = dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "package.json" || name === "package-lock.json") {
      continue;
    }
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
    const parts = remote.split("/").filter(Boolean);
    const fileName = parts.pop();
    let current = "";
    const mkdirChain = (i) => {
      if (i >= parts.length) {
        sftp.writeFile(remote, content, (err) => (err ? reject(err) : resolve()));
        return;
      }
      current += "/" + parts[i];
      sftp.mkdir(current, { mode: 0o755 }, () => mkdirChain(i + 1));
    };
    mkdirChain(0);
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

  await exec(conn, "mkdir -p /var/www/itestu/deploy/env /var/www/itestu/app /var/log/itestu");

  const files = collectFiles(DEPLOY);
  for (const { local, remote } of files) {
    console.log(`Upload: ${remote}`);
    await uploadSftp(sftp, local, remote);
  }

  console.log("\n=== Packaging application ===");
  const tarPath = join(tmpdir(), "itestu-app.tar.gz");
  execSync(
    `tar -czf "${tarPath}" --exclude=node_modules --exclude=.git --exclude=web/.next --exclude=api/dist --exclude=deploy/node_modules --exclude=web/test-results --exclude=web/playwright-report --exclude=api/prisma/dev.db --exclude=api/prisma/dev.db-journal --exclude=.cursor --exclude=assets -C "${ROOT}" .`,
    { stdio: "inherit" },
  );
  console.log("Uploading application archive...");
  await uploadSftp(sftp, tarPath, "/var/www/itestu/app.tar.gz");
  await exec(conn, "rm -rf /var/www/itestu/app && mkdir -p /var/www/itestu/app && tar -xzf /var/www/itestu/app.tar.gz -C /var/www/itestu/app && rm /var/www/itestu/app.tar.gz");

  await exec(conn, "chmod +x /var/www/itestu/deploy/*.sh");

  const skipBootstrap = process.argv.includes("--skip-bootstrap");
  if (!skipBootstrap) {
    console.log("\n=== Running bootstrap ===");
    await exec(conn, "bash /var/www/itestu/deploy/bootstrap.sh");
  }

  console.log("\n=== Running deploy ===");
  await exec(conn, "SKIP_GIT=1 bash /var/www/itestu/deploy/deploy-app.sh");

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
