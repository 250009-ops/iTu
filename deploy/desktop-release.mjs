#!/usr/bin/env node
/**
 * Build desktop installers and print upload instructions.
 * Requires Rust + Tauri CLI on the build machine.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktopDir = path.join(root, "desktop");

if (!existsSync(path.join(desktopDir, "package.json"))) {
  console.error("desktop/ package not found");
  process.exit(1);
}

const platform = process.platform;
const script =
  platform === "win32"
    ? "build:windows"
    : platform === "darwin"
      ? "build:macos"
      : "build:linux";

console.log(`Building iTestU desktop (${script})…`);
const result = spawnSync("npm", ["run", script], {
  cwd: desktopDir,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    WEB_APP_URL: process.env.WEB_APP_URL ?? "https://itestu.uz",
  },
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("\nUpload artifacts to VPS /var/www/releases/desktop/");
console.log("Then update platform settings section desktop_releases with URLs and sha256.");
