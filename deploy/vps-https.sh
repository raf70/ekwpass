#!/usr/bin/env bash
# Install Let's Encrypt (certbot), UFW, and host nginx for ekwpass on Debian/Ubuntu.
# Run as root, from the repo: sudo bash deploy/vps-https.sh
#
# Requirements before running:
#  - A DNS A record pointing to this server.
#  - App running on 127.0.0.1:3000, e.g. in /home/raf/ekwpass:
#      docker compose -f docker-compose.prod.yml up -d --build

set -euo pipefail

DOMAIN="${DOMAIN:-abc.def.com}"
EMAIL="${CERTBOT_EMAIL:-}"
EKV_ROOT="${EKV_ROOT:-$HOME/ekwpass}"
CONF_SRC="$(cd "$(dirname "$0")" && pwd)/ekwpass-host-nginx.conf"
TARGET_CONF="/etc/nginx/sites-available/ekwpass"

if [[ $(id -u) -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

if ! command -v apt-get &>/dev/null; then
  echo "This script targets apt-based systems (Debian/Ubuntu)." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ufw nginx certbot python3-certbot-nginx

# Firewall: SSH + HTTP/HTTPS; adjust if you use a non-22 SSH port
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status

if [[ ! -f "$EKV_ROOT/docker-compose.prod.yml" ]]; then
  echo "Warning: ekwpass not found at $EKV_ROOT (set EKV_ROOT=...). Start the stack so port 3000 is listening before certbot."
fi

# Site config: replace server_name in template if DOMAIN differs
if [[ -f "$CONF_SRC" ]]; then
  sed "s/server_name abc.def.com;/server_name ${DOMAIN};/" "$CONF_SRC" > /tmp/ekwpass-host-nginx.conf
  install -m 0644 /tmp/ekwpass-host-nginx.conf "$TARGET_CONF"
  ln -sf "$TARGET_CONF" /etc/nginx/sites-enabled/ekwpass
  # Avoid default site stealing port 80
  if [[ -L /etc/nginx/sites-enabled/default ]]; then
    rm -f /etc/nginx/sites-enabled/default
  fi
else
  echo "Missing $CONF_SRC" >&2
  exit 1
fi

nginx -t
systemctl reload nginx

# Obtain/renew cert (nginx plugin)
if [[ -n "$EMAIL" ]]; then
  certbot --nginx -d "$DOMAIN" --agree-tos --non-interactive --email "$EMAIL"
else
  echo "No CERTBOT_EMAIL set; using certbot's unsafely-without-email. Set CERTBOT_EMAIL for important notifications."
  certbot --nginx -d "$DOMAIN" --agree-tos --non-interactive --register-unsafely-without-email
fi

systemctl reload nginx
echo "Done. Test: curl -I https://$DOMAIN"
