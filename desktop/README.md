# iTestU Desktop

Unified Tauri shell for the iTestU web ERP. After login, users are routed to their role portal automatically.

## Configuration

Set `WEB_APP_URL` before building or running:

- Production: `https://itestu.uz`
- Local dev: `http://localhost:3000`

## Development

```bash
cd desktop
npm install
# Start web + api first, then:
$env:WEB_APP_URL="http://localhost:3000"; npm run dev
```

## Build

Requires Rust toolchain and platform-specific dependencies (see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)).

```bash
npm run build:windows   # .msi + .exe
npm run build:macos     # .dmg
npm run build:linux     # .AppImage + .deb
```

Upload artifacts to `/var/www/releases/desktop/` on the VPS and update Admin → Settings → Desktop releases (or `desktop_releases` platform settings).

## Features

- Loads hosted Next.js app (SSR-compatible)
- Native offline/boot screen with toast + retry (no Chromium error pages)
- Persists last portal/exam path via Tauri IPC so relaunch continues where left off
- Dispatches `itestu:exam-suspend` on network loss / low battery
- Deep link scheme `itestu://exam/{sessionCode}` (planned)
