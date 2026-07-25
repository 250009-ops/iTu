# Deployment environment templates

Copy these files when provisioning a server. **Do not commit real secrets.**

| File | Destination | Purpose |
|------|-------------|---------|
| `api.env.example` | `api/.env` on VPS | NestJS API, database, Redis, integrations |
| `web.env.local.example` | `web/.env.local` | Next.js public API URL |

## Minimum for local development

See root `api/.env.example` and `web/.env.example`. Start infrastructure:

```bash
cd api && docker compose up -d
```

Redis powers **server-authoritative exam timers** and **per-session locks**. If Redis is down, the API falls back to database timers (no distributed locks).

## Media storage (Eskiz VPS)

Create the media directory on the server and ensure the API process can write to it:

```bash
sudo mkdir -p /var/www/itestu/media/{listening,maps,recordings,results}
sudo chown -R $USER:$USER /var/www/itestu/media
```

Set in `api/.env`:

- `MEDIA_ROOT=/var/www/itestu/media`
- `MEDIA_PUBLIC_URL=https://itestu.uz/media`
- `SERVE_MEDIA_LOCALLY=false` (nginx serves files; API only writes)

## Uzum Checkout credentials

After Uzum sends Terminal ID / API key / mTLS certs (post-Didox contract):

1. Fill `UZUM_CHECKOUT_*` in `deploy/env/api.env` (gitignored vault copy).
2. Store PEM files in `/var/www/itestu/secrets/` on the VPS — see `deploy/secrets/README.md`.
3. Register callback: `https://itestu.uz/api/v1/payments/webhooks/uzum-checkout`
4. Redeploy or `pm2 restart itestu-api --update-env`.

Reload nginx after updating `deploy/nginx/itestu.uz.conf`.

## Telegram

Used for institution/student onboarding bot DMs and marketplace mock-feedback posts.
There is **no** shared ops/alert Telegram channel — admin alerts are in-app notifications + email.

| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot API token (`@BotFather`) — required for any send |
| `TELEGRAM_BOT_USERNAME` | Public bot handle for deep links |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook auth header secret |
| `TELEGRAM_POLLING` | Dev long-poll vs production webhook |
| `TELEGRAM_WEBHOOK_BASE_URL` | Public HTTPS host for webhook registration |
| `TELEGRAM_FEEDBACK_CHANNEL_ID` | Private channel for mock feedback only (default `-1004413242735`) — never used as a default for other sends |

Destinations by path:

- Onboarding replies → chat id from the inbound Telegram update (DM)
- Institution approve/reject → `institution.telegramChatId` (stored at apply time)
- Mock feedback → `TELEGRAM_FEEDBACK_CHANNEL_ID` only (`sendToFeedbackChannel`)

If the bot token is missing or Telegram returns 403/wrong-chat, feedback is still saved in the DB; send returns false with a warning log. The bot must be an admin of the feedback channel.

## Health checks

- API: `GET /api/v1/health` — reports `database` and `redis` status
- Admin audit trail: `GET /api/v1/admin/audit-logs` (admin JWT)

## Production deploy (enterprise)

1. Copy `deploy/.env.example` → `deploy/.env` and set `VPS_PASSWORD` (never commit).
2. Commit and push to `main`.
3. From repo root:

```bash
cd deploy && npm ci
VPS_PASSWORD=... npm run production
```

This uploads `api` + `web`, runs `deploy-rebuild.sh` on the VPS (preserves `deploy/env/api.env`), applies Prisma schema, rebuilds, and restarts PM2.

## Pre-launch checklist

Before activating a package for real students:

1. **Content** — Every included skill has a **published** test assigned in Admin → Packages.
2. **Listening audio** — Published listening tests linked to the package have `full-audio` (or legacy part tracks) uploaded and files present under `MEDIA_ROOT`.
3. **Exclusive papers** — No Listening/Reading/Writing test is linked to two active packages (use Replace mock or Retire & duplicate instead of reusing papers).
4. **Pilot cleanup** — After a failed pilot, use **Reset pilot** on the package (clears enrollments/orders/sessions; keeps content). Do not use Replace mock unless you need a new package row.
5. **Verify script** — Run production audit:

```bash
# On VPS / with DATABASE_URL in api/.env
cd api && npm run verify:production

# From your machine (health + remote DB audit)
cd deploy && VPS_PASSWORD=... npm run verify
```

Set `MIGRATION_STRICT_PACKAGE_CONTENT=true` in deploy env if you want `pre-db-push-migrate` to abort on duplicate exclusive assignments instead of only logging them.

**Git pull on server** (when the VPS has a clone):

```bash
ssh root@170.168.6.42 'bash /var/www/itestu/deploy/deploy-update.sh'
```
