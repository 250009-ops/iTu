#!/usr/bin/env bash
# Rebuild from files on disk — no git pull, no db:seed (production-safe).
set -euo pipefail

APP_DIR="/var/www/itestu/app"
DEPLOY_DIR="/var/www/itestu/deploy"
DOMAIN="${DOMAIN:-itestu.uz}"

echo "==> Preserving server environment..."
if [[ -f "$DEPLOY_DIR/env/api.env" ]]; then
  cp "$DEPLOY_DIR/env/api.env" "$APP_DIR/api/.env"
fi
if [[ -f "$DEPLOY_DIR/env/web.env.local" ]]; then
  cp "$DEPLOY_DIR/env/web.env.local" "$APP_DIR/web/.env.local"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/ensure-local-media.sh"
if [[ -d "$APP_DIR/deploy/fonts" ]]; then
  mkdir -p "$DEPLOY_DIR/fonts"
  cp -a "$APP_DIR/deploy/fonts/." "$DEPLOY_DIR/fonts/"
fi
if [[ -f "$DEPLOY_DIR/env/api.env" ]]; then
  cp "$DEPLOY_DIR/env/api.env" "$APP_DIR/api/.env"
fi

echo "==> Ensuring Postgres & Redis..."
cd "$DEPLOY_DIR"
docker compose up -d
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U itestu -d itestu_erp >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> Building API..."
cd "$APP_DIR/api"
npm ci
npx prisma generate
npx tsx prisma/pre-db-push-migrate.ts
npx prisma db push --accept-data-loss
npm run build

echo "==> Syncing catalog prices (UZS)..."
npm run packages:sync-prices || true

echo "==> Importing speaking mock bank (SPK-MOCK-A001–A010)..."
npx tsx scripts/import-speaking-mocks.ts || true

echo "==> Aligning legacy practice unit codes and titles..."
npm run practice:migrate-units || true

echo "==> Building Web..."
cd "$APP_DIR/web"
npm ci
if [[ -f "$DEPLOY_DIR/fonts/google-font-mocks.cjs" ]]; then
  export NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$DEPLOY_DIR/fonts/google-font-mocks.cjs"
fi
npm run build

echo "==> Restarting PM2..."
cd "$APP_DIR"
pm2 restart itestu-api itestu-web --update-env || pm2 start ecosystem.config.cjs
pm2 save

if [[ -f "$DEPLOY_DIR/nginx/itestu.uz.conf" ]]; then
  echo "==> Updating nginx upload limits..."
  cp -f "$DEPLOY_DIR/nginx/itestu.uz.conf" "/etc/nginx/sites-available/${DOMAIN}"
  nginx -t && systemctl reload nginx
elif [[ -f "$APP_DIR/deploy/nginx/itestu.uz.conf" ]]; then
  echo "==> Updating nginx upload limits..."
  mkdir -p "$DEPLOY_DIR/nginx"
  cp -f "$APP_DIR/deploy/nginx/itestu.uz.conf" "$DEPLOY_DIR/nginx/itestu.uz.conf"
  cp -f "$DEPLOY_DIR/nginx/itestu.uz.conf" "/etc/nginx/sites-available/${DOMAIN}"
  nginx -t && systemctl reload nginx
fi

echo "==> Health checks..."
sleep 3
curl -sf "http://127.0.0.1:3001/api/v1/health" | head -c 200 || echo "API health failed"
curl -sf -o /dev/null -w "WEB:%{http_code}\n" "http://127.0.0.1:3000" || true
curl -sf -o /dev/null -w "HTTPS:%{http_code}\n" "https://${DOMAIN}/" || true
curl -sf -o /dev/null -w "API_PUBLIC:%{http_code}\n" "https://${DOMAIN}/api/v1/health" || true

pm2 status
echo "==> Rebuild complete."
