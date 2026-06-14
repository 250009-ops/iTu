#!/usr/bin/env bash
# Deploy / update itestu.uz application
set -euo pipefail

APP_DIR="/var/www/itestu/app"
DEPLOY_DIR="/var/www/itestu/deploy"
REPO_URL="${REPO_URL:-https://github.com/250009-ops/iTu.git}"
DOMAIN="${DOMAIN:-itestu.uz}"

echo "==> Pulling latest code..."
if [[ "${SKIP_GIT:-}" == "1" ]]; then
  echo "Skipping git (source uploaded directly)."
elif [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
else
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

echo "==> Copying environment files..."
cp "$DEPLOY_DIR/env/api.env" "$APP_DIR/api/.env"
cp "$DEPLOY_DIR/env/web.env.local" "$APP_DIR/web/.env.local"
cp "$DEPLOY_DIR/docker-compose.prod.yml" "$DEPLOY_DIR/docker-compose.yml"

echo "==> Starting Postgres & Redis..."
cd "$DEPLOY_DIR"
docker compose up -d
echo "Waiting for Postgres..."
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
npm run db:seed || true
npm run sync:exam-content || true
npm run build

echo "==> Building Web..."
cd "$APP_DIR/web"
npm ci
npm run build

echo "==> Starting PM2 processes..."
cp "$DEPLOY_DIR/ecosystem.config.cjs" "$APP_DIR/ecosystem.config.cjs"
cd "$APP_DIR"
pm2 delete itestu-api itestu-web 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo "==> Configuring Nginx..."
if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  cp "$DEPLOY_DIR/nginx/itestu.uz.conf" "/etc/nginx/sites-available/$DOMAIN"
else
  cp "$DEPLOY_DIR/nginx/itestu.uz.bootstrap.conf" "/etc/nginx/sites-available/$DOMAIN"
fi
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Deploy complete."
pm2 status
