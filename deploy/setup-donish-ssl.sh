#!/usr/bin/env bash
# Obtain SSL certificate for donish.live
set -euo pipefail

DOMAIN="${DOMAIN:-donish.live}"
EMAIL="${SSL_EMAIL:-250009@tmuni.org}"
SITE="/etc/nginx/sites-available/donish.live"

certbot certonly --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive

cp /var/www/itestu/deploy/nginx/donish.live.conf "$SITE"
nginx -t
systemctl reload nginx

echo "SSL installed for $DOMAIN"
