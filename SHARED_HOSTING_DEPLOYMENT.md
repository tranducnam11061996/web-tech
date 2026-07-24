# Shared Hosting Deployment — tructiepgame.vn

Last verified: `2026-07-24`

This runbook targets the current cPanel/CloudLinux environment:

- cPanel `118.0.68` with CloudLinux Node.js Selector and Passenger.
- Node.js `22.22.2`.
- Storefront `https://tructiepgame.vn`.
- Admin/API `https://admin.tructiepgame.vn`.
- MySQL `8.0.36`, database `nhviebwh_it_tech_db`.
- Source root `/home/nhviebwh/tructiepgame.vn`.
- Storefront document root `/home/nhviebwh/tructiepgame-public`.
- Admin document root `/home/nhviebwh/admin.tructiepgame.vn`.
- Shared media root `/home/nhviebwh/tructiepgame.vn/media`.

The document roots must remain separate from the source root. Never serve the repository, `.git`, Markdown handoff files, package manifests, or environment files as static content.

## Runtime topology

| Public URL | Application root | Startup file |
|---|---|---|
| `https://tructiepgame.vn` | `tructiepgame.vn/font-end` | `app.js` |
| `https://admin.tructiepgame.vn` | `tructiepgame.vn/web-admin` | `app.js` |

Passenger owns public HTTP/HTTPS routing and process lifecycle. Do not use the Windows-oriented root `ecosystem.config.cjs` or `Caddyfile` on this hosting account.

The storefront proxies `/api/*` to `API_INTERNAL_URL`. The destination is captured by `next build`, so configure it before building.

## Preconditions

1. `admin`, `@`, and `www` DNS A records resolve to `103.124.95.33`.
2. AutoSSL validates `tructiepgame.vn`, `www.tructiepgame.vn`, and `admin.tructiepgame.vn`.
3. **Force HTTPS Redirect** is enabled in cPanel for both public and admin domains.
4. The hosting-safe SQL bundle is imported into `nhviebwh_it_tech_db`.
5. `media` exists and is writable by the cPanel account.
6. No real secret is committed to Git or written into `.env.example`.

## Create the admin/API application

In **cPanel → Setup Node.js App → Create Application**:

- Node.js version: `22.22.2`
- Application mode: `Production`
- Application root: `tructiepgame.vn/web-admin`
- Application URL: `admin.tructiepgame.vn` with an empty path
- Application startup file: `app.js`

Configure these values before building. Secret placeholders must be generated or entered directly in cPanel; never paste them into Git or deployment logs.

```env
DATABASE_URL=mysql://nhviebwh:<URL_ENCODED_DB_PASSWORD>@localhost:3306/nhviebwh_it_tech_db
NEXTAUTH_SECRET=<AT_LEAST_32_RANDOM_BYTES>
NEXTAUTH_URL=https://admin.tructiepgame.vn
PUBLIC_API_URL=https://admin.tructiepgame.vn
NEXT_PUBLIC_API_URL=https://admin.tructiepgame.vn
STOREFRONT_URL=https://tructiepgame.vn
NEXT_PUBLIC_STOREFRONT_URL=https://tructiepgame.vn
STOREFRONT_ORIGIN=https://tructiepgame.vn
STOREFRONT_ORIGINS=https://tructiepgame.vn,https://www.tructiepgame.vn
MEDIA_ROOT=/home/nhviebwh/tructiepgame.vn/media
MEDIA_BASE_URL=/api/media
ADMIN_WRITE_ENABLED=false
DB_CONNECTION_LIMIT=8
DB_QUEUE_LIMIT=200
DB_CONNECT_TIMEOUT_MS=5000
BACKGROUND_WORKER_POLL_MS=2000
RECAPTCHA_SECRET_KEY=<SECRET_FROM_RECAPTCHA>
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<PUBLIC_SITE_KEY>
RECAPTCHA_ALLOWED_HOSTNAMES=tructiepgame.vn,www.tructiepgame.vn,admin.tructiepgame.vn
RECAPTCHA_DEVELOPMENT_BYPASS=false
RECAPTCHA_SHADOW_MODE=true
SEARCH_WEBHOOK_SECRET=<AT_LEAST_32_RANDOM_BYTES>
FLASH_SALE_BUYER_HASH_SECRET=<AT_LEAST_32_RANDOM_BYTES>
INTERNAL_METRICS_TOKEN=<AT_LEAST_32_RANDOM_BYTES>
NOTIFY_ON_ORDER=false
PAGE_VIEW_TRACKING_ENABLED=true
```

Add the SMTP variables only after the sender account is ready:

```env
SMTP_HOST=<SMTP_HOST>
SMTP_PORT=587
SMTP_USER=<SMTP_USER>
SMTP_PASS=<SMTP_APP_PASSWORD>
SMTP_FROM=TrucTiepGAME <no-reply@tructiepgame.vn>
```

Keep `NOTIFY_ON_ORDER=false` until a one-shot worker run proves SMTP delivery. Keep `ADMIN_WRITE_ENABLED=false` through the first readiness check.

After saving the application:

1. Run **NPM Install**.
2. Run the package script `build`.
3. Restart the application.
4. Inspect the Passenger log shown by Node.js Selector if startup fails.

## Create the storefront application

In **cPanel → Setup Node.js App → Create Application**:

- Node.js version: `22.22.2`
- Application mode: `Production`
- Application root: `tructiepgame.vn/font-end`
- Application URL: `tructiepgame.vn` with an empty path
- Application startup file: `app.js`

Set these variables before running `build`:

```env
API_INTERNAL_URL=https://admin.tructiepgame.vn
NEXT_PUBLIC_API_URL=https://admin.tructiepgame.vn
NEXT_PUBLIC_SITE_URL=https://tructiepgame.vn
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<PUBLIC_SITE_KEY>
```

Then run **NPM Install**, run the `build` package script, and restart the application.

## Background worker through Cron

The normal `worker:background` command is a persistent process and is not appropriate for cPanel Cron. `worker:background:once` processes one bounded cycle and exits. It holds the MySQL named lock `web_admin_background_worker_once`, so a slow run cannot overlap the next invocation.

After the admin application exists, Node.js Selector displays a command similar to:

```sh
source /home/nhviebwh/nodevenv/<APPLICATION_ROOT>/22/bin/activate
```

Copy that exact activation path from cPanel; do not guess it. Configure **cPanel → Cron Jobs** to run once per minute:

```sh
/bin/bash -lc 'source <EXACT_NODE_VENV_ACTIVATE_PATH> && cd /home/nhviebwh/tructiepgame.vn/web-admin && npm run worker:background:once >> /home/nhviebwh/logs/tructiepgame-worker.log 2>&1'
```

Run it manually once through Node.js Selector's **Run JS Script** using `worker:background:once` before enabling the Cron entry. Confirm the log contains:

```text
[background-worker] one-shot run completed
```

Only then configure SMTP, set `NOTIFY_ON_ORDER=true`, restart the admin application, and run another controlled email test.

## Acceptance checks

Before enabling admin writes:

```text
https://admin.tructiepgame.vn/api/health/live
https://admin.tructiepgame.vn/api/health/ready
https://tructiepgame.vn/
https://tructiepgame.vn/api/health/live
```

Expected:

- Both health endpoints return success.
- Storefront loads without horizontal redirect loops or mixed-content errors.
- `/api/*` on the storefront reaches `web-admin`.
- Product/category/search reads return hosting database data.
- Media URLs resolve through `/api/media/*`.
- Passenger logs contain no database credential, raw SQL error, or repeated restart loop.

After the database, media, CAPTCHA, origin, and backup checks pass, set `ADMIN_WRITE_ENABLED=true` in the admin application and restart it. Verify one low-risk admin edit and confirm a new `admin_audit_logs` row is created.

## Safe update procedure

1. Keep database and media backups outside the Git working tree.
2. Pull or upload the new source without copying local `node_modules` or `.next`.
3. Add or update cPanel environment variables first.
4. Run NPM Install only when lockfiles changed.
5. Run `build` in `web-admin`, then restart it and check readiness.
6. Run `build` in `font-end`, then restart it and check the storefront.
7. Run one worker cycle and inspect its log.
8. Do not import a database dump over the live database as a routine code deployment.

If a build or startup fails, leave `ADMIN_WRITE_ENABLED=false`, retain the previous `.next` output if still present, and collect the Node.js Selector/Passenger log before making another change.
