#!/usr/bin/env node
/**
 * Upload desktop release artifacts to VPS and update platform settings.
 *
 * Usage:
 *   VPS_PASSWORD=... node deploy/upload-desktop-release.mjs
 *   VPS_PASSWORD=... node deploy/upload-desktop-release.mjs dist/desktop/iTestU_1.0.0_x64-setup.exe
 *   VPS_PASSWORD=... node deploy/upload-desktop-release.mjs --all
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';
import { VPS, assertVpsCredentials } from './lib/vps.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REMOTE_DIR = '/var/www/releases/desktop';
const VERSION = process.env.DESKTOP_VERSION || '1.0.0';
const DIST_DIR = path.join(ROOT, 'dist', 'desktop');

const PLATFORM_PATTERNS = {
  windows: [/iTestU_.*_x64-setup\.exe$/i, /iTestU_.*_x64_en-US\.msi$/i],
  macos: [/iTestU_.*\.dmg$/i, /iTestU_.*universal\.dmg$/i],
  linux: [/iTestU_.*\.AppImage$/i, /iTestU_.*amd64\.deb$/i],
};

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let errOut = '';
      stream.on('data', (d) => process.stdout.write(d));
      stream.stderr.on('data', (d) => {
        errOut += d.toString();
        process.stderr.write(d);
      });
      stream.on('close', (c) =>
        c === 0 ? resolve() : reject(new Error(errOut || `exit ${c}`)),
      );
    });
  });
}

function upload(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    const data = Buffer.isBuffer(local) ? local : readFileSync(local);
    sftp.writeFile(remote, data, (e) => (e ? reject(e) : resolve()));
  });
}

function artifactMeta(localPath) {
  const bytes = readFileSync(localPath);
  const fileName = path.basename(localPath);
  const domain = process.env.DEPLOY_DOMAIN || 'www.itestu.uz';
  return {
    fileName,
    localPath,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    size: statSync(localPath).size,
    url: `https://${domain}/releases/desktop/${fileName}`,
  };
}

function detectPlatform(fileName) {
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    if (patterns.some((re) => re.test(fileName))) return platform;
  }
  return null;
}

function collectArtifacts(inputPaths) {
  const artifacts = [];
  for (const input of inputPaths) {
    if (!existsSync(input)) continue;
    const stat = statSync(input);
    if (stat.isDirectory()) {
      for (const name of readdirSync(input)) {
        const full = path.join(input, name);
        if (statSync(full).isFile()) artifacts.push(full);
      }
    } else {
      artifacts.push(input);
    }
  }
  return artifacts;
}

async function main() {
  assertVpsCredentials();

  const uploadAll = process.argv.includes('--all');
  const fileArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'));

  let paths = fileArgs.map((p) => path.resolve(p));
  if (uploadAll || paths.length === 0) {
    paths = [DIST_DIR];
  }

  const files = collectArtifacts(paths);
  const platforms = {
    windows: null,
    macos: null,
    linux: null,
  };

  for (const file of files) {
    const base = path.basename(file);
    const platform = detectPlatform(base);
    if (!platform) continue;
    if (!platforms[platform] || base.includes('setup')) {
      platforms[platform] = artifactMeta(file);
    }
  }

  const toUpload = Object.values(platforms).filter(Boolean);
  if (toUpload.length === 0) {
    console.error('No recognized desktop artifacts found.');
    console.error('Run: node deploy/build-tauri-desktop.mjs');
    process.exit(1);
  }

  const conn = new Client();
  await new Promise((r, j) => conn.on('ready', r).on('error', j).connect(VPS));
  const sftp = await new Promise((r, j) =>
    conn.sftp((e, s) => (e ? j(e) : r(s))),
  );

  await exec(conn, `mkdir -p ${REMOTE_DIR}`);

  for (const artifact of toUpload) {
    console.log(
      `==> Uploading ${artifact.fileName} (${artifact.size} bytes)`,
    );
    await upload(sftp, artifact.localPath, `${REMOTE_DIR}/${artifact.fileName}`);
  }

  // Merge with existing platform settings when uploading a subset
  const existingRow = await new Promise((resolve, reject) => {
    conn.exec(
      `cd /var/www/itestu/app/api && node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.platformSettings.findUnique({where:{section:'desktop_releases'}}).then(r=>{console.log(JSON.stringify(r?.settings||{}));p.\\$disconnect();}).catch(e=>{console.error(e);process.exit(1);});"`,
      (err, stream) => {
        if (err) return reject(err);
        let out = '';
        stream.on('data', (d) => {
          out += d.toString();
        });
        stream.on('close', () => {
          try {
            resolve(JSON.parse(out.trim() || '{}'));
          } catch {
            resolve({});
          }
        });
      },
    );
  });

  for (const key of ['windows', 'macos', 'linux']) {
    if (!platforms[key]?.url && existingRow?.platforms?.[key]?.url) {
      platforms[key] = existingRow.platforms[key];
    }
  }

  const settings = {
    version: VERSION,
    releasedAt: new Date().toISOString(),
    platforms: {
      windows: platforms.windows ?? { url: '', sha256: '', size: 0 },
      macos: platforms.macos ?? { url: '', sha256: '', size: 0 },
      linux: platforms.linux ?? { url: '', sha256: '', size: 0 },
    },
  };

  const settingsJson = JSON.stringify(settings);

  await upload(
    sftp,
    Buffer.from(settingsJson),
    '/tmp/desktop-releases.json',
  );

  await exec(
    conn,
    `
set -e
cd /var/www/itestu/app/api
DESKTOP_RELEASES_JSON="$(cat /tmp/desktop-releases.json)" npx tsx scripts/update-desktop-releases.ts
rm -f /tmp/desktop-releases.json
`,
  );

  for (const artifact of toUpload) {
    await exec(conn, `curl -sfI '${artifact.url}' | head -1 || echo 'WARN: ${artifact.fileName}'`);
  }

  conn.end();
  console.log('\nDesktop releases uploaded and settings updated.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
