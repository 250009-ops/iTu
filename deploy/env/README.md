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
sudo mkdir -p /var/www/itestu/media/{listening,recordings,results}
sudo chown -R $USER:$USER /var/www/itestu/media
```

Set in `api/.env`:

- `MEDIA_ROOT=/var/www/itestu/media`
- `MEDIA_PUBLIC_URL=https://itestu.uz/media`
- `SERVE_MEDIA_LOCALLY=false` (nginx serves files; API only writes)

Reload nginx after updating `deploy/nginx/itestu.uz.conf`.

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

**Git pull on server** (when the VPS has a clone):

```bash
ssh root@170.168.6.42 'bash /var/www/itestu/deploy/deploy-update.sh'
```
