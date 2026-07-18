#!/usr/bin/env node
/**
 * Build the Windows desktop installer (NSIS bootstrap).
 * Output: dist/desktop/iTestU_1.0.0_x64-setup.exe
 *
 * Requires NSIS (makensis). Install: winget install NSIS.NSIS
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'dist', 'desktop');
const nsi = path.join(root, 'desktop', 'installer', 'installer.nsi');

if (!existsSync(nsi)) {
  console.error('Missing desktop/installer/installer.nsi');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const makensis =
  process.env.MAKENSIS ??
  (process.platform === 'win32'
    ? 'C:\\Program Files (x86)\\NSIS\\makensis.exe'
    : 'makensis');

console.log('Building Windows installer…');
const result = spawnSync(`"${makensis}"`, ['/V2', nsi], {
  stdio: 'inherit',
  shell: true,
});

if (result.status !== 0) {
  console.error(
    '\nNSIS build failed. Install NSIS: winget install NSIS.NSIS --accept-package-agreements',
  );
  process.exit(result.status ?? 1);
}

const artifact = path.join(outDir, 'iTestU_1.0.0_x64-setup.exe');
if (!existsSync(artifact)) {
  console.error('Expected artifact not found:', artifact);
  process.exit(1);
}

console.log('\nBuilt:', artifact);
