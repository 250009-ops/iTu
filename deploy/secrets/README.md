# Uzum Checkout secrets (never commit PEM files)

When Uzum Bank sends mTLS credentials, store them **outside git**:

## Production VPS

```bash
sudo mkdir -p /var/www/itestu/secrets
sudo chmod 700 /var/www/itestu/secrets
# Upload uzum-client.crt and uzum-client.key from Uzum (secure channel only)
sudo chmod 600 /var/www/itestu/secrets/uzum-client.*
sudo chown root:root /var/www/itestu/secrets/uzum-client.*
```

Set in `deploy/env/api.env`:

```env
UZUM_CHECKOUT_TERMINAL_ID="..."
UZUM_CHECKOUT_API_KEY="..."          # if Uzum issues API key instead of mTLS
UZUM_CHECKOUT_CERT_PATH="/var/www/itestu/secrets/uzum-client.crt"
UZUM_CHECKOUT_KEY_PATH="/var/www/itestu/secrets/uzum-client.key"
UZUM_CHECKOUT_BASE_URL="..."         # confirm prod URL with Uzum
```

Then redeploy or `pm2 restart itestu-api --update-env`.

## Local development

Optional: copy PEMs to this folder (gitignored) and point `api/.env`:

```env
UZUM_CHECKOUT_CERT_PATH="C:/projects/IELTS_MOCK_ERP/deploy/secrets/uzum-client.crt"
UZUM_CHECKOUT_KEY_PATH="C:/projects/IELTS_MOCK_ERP/deploy/secrets/uzum-client.key"
```

## Callback URL (register in Uzum terminal)

```
https://itestu.uz/api/v1/payments/webhooks/uzum-checkout
```
