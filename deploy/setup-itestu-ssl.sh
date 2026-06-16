#!/usr/bin/env bash
# Obtain SSL certificate for itestu.uz
set -euo pipefail

DOMAIN="${DOMAIN:-itestu.uz}"
EMAIL="${SSL_EMAIL:-250009@tmuni.org}"
SITE="/etc/nginx/sites-available/itestu.uz"

certbot certonly --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive

cp /var/www/itestu/deploy/nginx/itestu.uz.conf "$SITE"
nginx -t
systemctl reload nginx

echo "SSL installed for $DOMAIN"
