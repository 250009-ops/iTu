#!/usr/bin/env node
/**
 * Generate app-icon.png and Tauri icon set from web/public/favicon.svg.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const desktopDir = path.join(root, 'desktop');
const svgPath = path.join(root, 'web', 'public', 'favicon.svg');
const pngPath = path.join(desktopDir, 'app-icon.png');
const sharpPath = path.join(root, 'web', 'node_modules', 'sharp');

if (!existsSync(svgPath)) {
  console.error('Missing brand icon:', svgPath);
  process.exit(1);
}

if (!existsSync(sharpPath)) {
  console.error('Missing sharp — run npm install in web/ first.');
  process.exit(1);
}

const sharp = require(sharpPath);

mkdirSync(desktopDir, { recursive: true });

console.log('Rasterizing brand icon from', svgPath);
await sharp(svgPath, { density: 384 })
  .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(pngPath);

console.log('Wrote', pngPath);

if (!existsSync(path.join(desktopDir, 'node_modules'))) {
  console.log('Installing desktop devDependencies…');
  const install = spawnSync('npm', ['install'], {
    cwd: desktopDir,
    stdio: 'inherit',
    shell: true,
  });
  if (install.status !== 0) process.exit(install.status ?? 1);
}

console.log('Generating Tauri icon set…');
const iconResult = spawnSync('npx', ['tauri', 'icon', pngPath], {
  cwd: desktopDir,
  stdio: 'inherit',
  shell: true,
});
process.exit(iconResult.status ?? 0);
