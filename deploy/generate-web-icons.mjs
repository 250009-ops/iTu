#!/usr/bin/env node
/**
 * Regenerate web/public favicons and PWA icons from desktop/brand-icon.svg.
 * Google Search prefers square PNG/ICO ≥48px at stable URLs (/favicon.ico, /icon-48.png).
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(root, 'desktop', 'brand-icon.svg');
const publicDir = path.join(root, 'web', 'public');
const appDir = path.join(root, 'web', 'src', 'app');

const sharpCandidates = [
  path.join(root, 'web', 'node_modules', 'sharp'),
  path.join(root, 'node_modules', 'sharp'),
];

let sharpPath = sharpCandidates.find((candidate) => existsSync(candidate));
if (!sharpPath) {
  console.error('Run npm install in web/ first (sharp required).');
  process.exit(1);
}

const sharp = require(sharpPath);

if (!existsSync(svgPath)) {
  console.error('Missing', svgPath);
  process.exit(1);
}

mkdirSync(publicDir, { recursive: true });
mkdirSync(path.join(publicDir, 'logo'), { recursive: true });

const sizes = [
  { name: 'icon-32.png', size: 32 },
  { name: 'icon-48.png', size: 48 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

console.log('Generating PNG icons from', svgPath);
for (const { name, size } of sizes) {
  const out = path.join(publicDir, name);
  await sharp(svgPath, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(out);
  console.log('  wrote', name);
}

// Multi-size ICO for legacy crawlers (16 + 32 + 48)
const icoSizes = [16, 32, 48];
const pngBuffers = await Promise.all(
  icoSizes.map((size) =>
    sharp(svgPath, { density: 384 }).resize(size, size).png().toBuffer(),
  ),
);

function buildIco(buffers, sizesList) {
  const count = buffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = [];
  let offset = 6 + count * 16;
  for (let i = 0; i < count; i++) {
    const size = sizesList[i];
    const buf = buffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += buf.length;
  }
  return Buffer.concat([header, ...entries, ...buffers]);
}

writeFileSync(path.join(publicDir, 'favicon.ico'), buildIco(pngBuffers, icoSizes));
console.log('  wrote favicon.ico');

// Next.js metadata file conventions (App Router)
for (const [dest, size] of [
  ['icon.png', 512],
  ['apple-icon.png', 180],
]) {
  await sharp(svgPath, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(appDir, dest));
  console.log('  wrote src/app/', dest);
}

// Copy SVG assets
const { copyFileSync } = await import('node:fs');
copyFileSync(svgPath, path.join(publicDir, 'logo', 'itestu3.svg'));
copyFileSync(svgPath, path.join(publicDir, 'favicon.svg'));
console.log('Done.');
