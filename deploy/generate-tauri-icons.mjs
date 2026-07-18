#!/usr/bin/env node
/**
 * Generate app-icon.png and Tauri icon set from brand colors.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const desktopDir = path.join(root, 'desktop');
const pngPath = path.join(desktopDir, 'app-icon.png');

mkdirSync(desktopDir, { recursive: true });

function int32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function crc(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  const out = Buffer.alloc(4);
  out.writeUInt32BE((c ^ 0xffffffff) >>> 0, 0);
  return out;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const body = Buffer.concat([typeBuf, data]);
  return Buffer.concat([int32(data.length), body, crc(body)]);
}

function writeBrandPng(filePath) {
  const size = 1024;
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const r = 18;
      const inRect = x >= r && y >= r && x < size - r && y < size - r;
      const inLetter =
        (x > 280 && x < 360 && y > 340 && y < 720) ||
        (x > 380 && x < 740 && y > 340 && y < 420) ||
        (x > 380 && x < 460 && y > 340 && y < 720) ||
        (x > 520 && x < 740 && y > 520 && y < 600);

      if (!inRect) {
        pixels[i + 3] = 0;
        continue;
      }

      if (inLetter) {
        pixels[i] = 255;
        pixels[i + 1] = 255;
        pixels[i + 2] = 255;
      } else {
        pixels[i] = 227;
        pixels[i + 1] = 24;
        pixels[i + 2] = 55;
      }
      pixels[i + 3] = 255;
    }
  }

  const stride = 1 + size * 4;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * stride;
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.concat([
    int32(size),
    int32(size),
    Buffer.from([0x08, 0x06, 0x00, 0x00, 0x00]),
  ]);
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(filePath, png);
  console.log('Wrote', filePath);
}

writeBrandPng(pngPath);

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
