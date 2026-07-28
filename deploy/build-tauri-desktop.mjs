#!/usr/bin/env node
/**
 * Build Tauri desktop installers for the current platform.
 * Output copied to dist/desktop/
 *
 *   WEB_APP_URL=https://www.itestu.uz node deploy/build-tauri-desktop.mjs
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const desktopDir = path.join(root, 'desktop');
const outDir = path.join(root, 'dist', 'desktop');
const version = process.env.DESKTOP_VERSION || '1.0.0';

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    ...opts,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(path.join(desktopDir, 'node_modules'))) {
  console.log('Installing desktop dependencies…');
  run('npm', ['install'], { cwd: desktopDir });
}

console.log('Generating Tauri icons from brand favicon…');
run('node', ['deploy/generate-tauri-icons.mjs'], { cwd: root });

console.log('Generating NSIS installer branding assets…');
run('python', ['deploy/generate-nsis-branding.py'], { cwd: root });

const script =
  process.platform === 'win32'
    ? 'build:windows'
    : process.platform === 'darwin'
      ? 'build:macos'
      : 'build:linux';

console.log(`Building Tauri desktop (${script})…`);
run('npm', ['run', script], {
  cwd: desktopDir,
  env: {
    ...process.env,
    WEB_APP_URL: process.env.WEB_APP_URL ?? 'https://www.itestu.uz',
  },
});

const bundleDir = path.join(
  desktopDir,
  'src-tauri',
  'target',
  'release',
  'bundle',
);

if (!existsSync(bundleDir)) {
  console.error('Bundle directory not found:', bundleDir);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const patterns =
  process.platform === 'win32'
    ? [/\.exe$/i, /\.msi$/i]
    : process.platform === 'darwin'
      ? [/\.dmg$/i]
      : [/\.AppImage$/i, /\.deb$/i];

function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(full));
    else files.push(full);
  }
  return files;
}

const artifacts = collectFiles(bundleDir).filter((file) =>
  patterns.some((re) => re.test(file)),
);

if (artifacts.length === 0) {
  console.error('No installer artifacts found under', bundleDir);
  process.exit(1);
}

for (const src of artifacts) {
  const base = path.basename(src);
  const dest = path.join(outDir, base);
  cpSync(src, dest);
  console.log('Copied', dest, `(${statSync(dest).size} bytes)`);
}

console.log('\nTauri build complete. Artifacts in dist/desktop/');
