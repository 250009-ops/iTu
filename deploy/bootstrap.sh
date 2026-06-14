#!/usr/bin/env bash
# One-time VPS bootstrap for itestu.uz (Ubuntu/Debian)
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "==> Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

echo "==> Installing base packages..."
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx ufw ca-certificates gnupg lsb-release

echo "==> Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> Installing Docker..."
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${VERSION_CODENAME:-jammy}") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
systemctl enable docker
systemctl start docker

echo "==> Installing Node.js 20..."
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

echo "==> Installing PM2..."
npm install -g pm2

echo "==> Creating directories..."
mkdir -p /var/www/itestu/app
mkdir -p /var/www/itestu/deploy/env
mkdir -p /var/www/certbot
mkdir -p /var/log/itestu

echo "==> Bootstrap complete."
node -v
npm -v
docker -v
pm2 -v
