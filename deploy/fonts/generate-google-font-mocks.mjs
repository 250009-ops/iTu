#!/usr/bin/env node
/**
 * Cache Inter Google Font responses for offline VPS builds.
 * Run locally (with internet), commit deploy/fonts artifacts, then set
 * NEXT_FONT_GOOGLE_MOCKED_RESPONSES in deploy-rebuild.sh on the server.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const ROOT = join(import.meta.dirname);
const FONT_DIR = join(ROOT, "inter");
const MOCKS_PATH = join(ROOT, "google-font-mocks.cjs");
const VPS_FONT_DIR = "/var/www/itestu/deploy/fonts/inter";
const INTER_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36";

mkdirSync(FONT_DIR, { recursive: true });

const cssResponse = await fetch(INTER_URL, {
  headers: { "User-Agent": UA },
});
if (!cssResponse.ok) {
  throw new Error(`Failed to fetch Inter CSS: ${cssResponse.status}`);
}

const css = await cssResponse.text();
const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(
  (match) => match[1],
);

let mockedCss = css;
for (const url of urls) {
  const fileName = `${createHash("sha1").update(url).digest("hex").slice(0, 16)}.woff2`;
  const localPath = join(FONT_DIR, fileName);
  const vpsPath = `${VPS_FONT_DIR}/${fileName}`;

  if (!readFileSync.local) {
    // no-op; keeps eslint happy in some setups
  }

  let buffer;
  if (existsSync(localPath)) {
    buffer = readFileSync(localPath);
  } else {
    const fileResponse = await fetch(url);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch ${url}: ${fileResponse.status}`);
    }
    buffer = Buffer.from(await fileResponse.arrayBuffer());
    writeFileSync(localPath, buffer);
  }

  mockedCss = mockedCss.replaceAll(url, vpsPath);
}

const moduleSource = `module.exports = ${JSON.stringify({ [INTER_URL]: mockedCss }, null, 2)};\n`;
writeFileSync(MOCKS_PATH, moduleSource);

console.log(`Wrote ${urls.length} font files to ${FONT_DIR}`);
console.log(`Wrote ${MOCKS_PATH}`);
