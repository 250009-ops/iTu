#!/usr/bin/env bash
# Production update — pull latest main, rebuild, restart (no db:seed, no bootstrap).
set -euo pipefail

APP_DIR="/var/www/itestu/app"
DEPLOY_DIR="/var/www/itestu/deploy"
DOMAIN="${DOMAIN:-itestu.uz}"

echo "==> Pulling latest code..."
cd "$APP_DIR"
git fetch origin
git reset --hard origin/main

echo "==> Refreshing environment from deploy vault (unchanged if files exist)..."
if [[ -f "$DEPLOY_DIR/env/api.env" ]]; then
  cp "$DEPLOY_DIR/env/api.env" "$APP_DIR/api/.env"
fi
if [[ -f "$DEPLOY_DIR/env/web.env.local" ]]; then
  cp "$DEPLOY_DIR/env/web.env.local" "$APP_DIR/web/.env.local"
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
npx prisma db push --accept-data-loss
npm run build

echo "==> Building Web..."
cd "$APP_DIR/web"
npm ci
npm run build

echo "==> Restarting PM2..."
cd "$APP_DIR"
pm2 restart itestu-api itestu-web || pm2 start ecosystem.config.cjs
pm2 save

echo "==> Health checks..."
sleep 3
curl -sf "http://127.0.0.1:3001/api/v1/health" | head -c 200 || echo "API health failed"
curl -sf -o /dev/null -w "WEB:%{http_code}\n" "http://127.0.0.1:3000" || true
curl -sf -o /dev/null -w "HTTPS:%{http_code}\n" "https://${DOMAIN}/" || true
curl -sf -o /dev/null -w "API_PUBLIC:%{http_code}\n" "https://${DOMAIN}/api/v1/health" || true

pm2 status
echo "==> Deploy update complete."

echo "==> Post-deploy content & package maintenance..."
cd "$APP_DIR/api"
npm run sync:exam-content
npm run content:patch
npm run content:migrate-names
if [[ "${FRESH_PACKAGES:-}" == "1" ]]; then
  npm run packages:clear -- --confirm
fi
