#!/usr/bin/env bash
# Obtain SSL certificate for itestu.uz (run after DNS points to this server)
set -euo pipefail

DOMAIN="${DOMAIN:-itestu.uz}"
EMAIL="${SSL_EMAIL:-250009@tmuni.org}"

certbot certonly --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive

cp /var/www/itestu/deploy/nginx/itestu.uz.conf "/etc/nginx/sites-available/$DOMAIN"
nginx -t
systemctl reload nginx

echo "SSL installed for $DOMAIN"
