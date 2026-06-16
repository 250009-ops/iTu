#!/usr/bin/env bash
# Ensure VPS disk media storage: directories + api.env vars (no S3 required).
set -euo pipefail

MEDIA_DIR="/var/www/itestu/media"
DEPLOY_ENV="/var/www/itestu/deploy/env/api.env"
APP_ENV="/var/www/itestu/app/api/.env"
DOMAIN="${DOMAIN:-itestu.uz}"

echo "==> Ensuring local media storage on VPS..."
mkdir -p "$MEDIA_DIR"/{listening,maps,writing,recordings,results}
chmod -R 755 "$MEDIA_DIR"

set_env() {
  local file="$1"
  local key="$2"
  local val="$3"
  [[ -f "$file" ]] || return 0
  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$file"
  else
    printf '\n# Local media on VPS disk (nginx serves /media/)\n%s=%s\n' "$key" "$val" >> "$file"
  fi
}

for f in "$DEPLOY_ENV" "$APP_ENV"; do
  set_env "$f" STORAGE_DRIVER local
  set_env "$f" MEDIA_ROOT "\"${MEDIA_DIR}\""
  set_env "$f" MEDIA_PUBLIC_URL "\"https://${DOMAIN}/media\""
  set_env "$f" SERVE_MEDIA_LOCALLY "\"false\""
done

echo "==> Media ready at ${MEDIA_DIR} (public URL https://${DOMAIN}/media)"
