# HACOM E-commerce Workspace

Last verified: `2026-07-11`

This workspace contains the HACOM storefront, admin dashboard, REST backend, background jobs, legacy MySQL integration, and deployment/load-test assets. AI agents should start with `AGENTS.md` and `AI_HANDOFF.md`.

## Applications

| Path | Responsibility | Stack | Port |
|---|---|---|---:|
| `web-admin` | Admin UI, public/admin/customer APIs, MySQL access, background jobs | Next.js 16.2.9, React 19.2.4, Tailwind 4, MySQL2 | 3000 |
| `font-end` | Customer storefront | Next.js 16.2.9, React 19.2.4, Tailwind 3 | 3001 |
| `search-tool` | Historical search prototype/reference only | Legacy prototype | - |

`font-end` must never connect to MySQL. All dynamic storefront data is served by `web-admin`.

## Local development

```powershell
cd D:\web-tech\web-admin
npm.cmd install
npm.cmd run dev
```

```powershell
cd D:\web-tech\font-end
npm.cmd install
npm.cmd run dev
```

- Admin/API: `http://localhost:3000`
- Storefront: `http://localhost:3001`
- Liveness: `http://localhost:3000/api/health/live`
- Readiness: `http://localhost:3000/api/health/ready`

For the one-host production topology, use `Caddyfile` and `ecosystem.config.cjs`: Caddy terminates HTTP, two clustered `web-admin` workers serve APIs/admin, one storefront worker serves the UI, and one worker processes email outbox retries and expired runtime records.

## Required environment groups

- Database/runtime: `DATABASE_URL`, `ADMIN_WRITE_ENABLED`, `DB_CONNECTION_LIMIT`, `DB_QUEUE_LIMIT`, `DB_CONNECT_TIMEOUT_MS`.
- URLs/origins: `NEXT_PUBLIC_API_URL`, `STOREFRONT_ORIGIN`.
- CAPTCHA: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `RECAPTCHA_SCORE_THRESHOLD`, `RECAPTCHA_ALLOWED_HOSTNAMES`, `RECAPTCHA_SHADOW_MODE`.
- Security/integrations: `NEXTAUTH_SECRET`, `SEARCH_WEBHOOK_SECRET`, SMTP variables.
- Media/location: `MEDIA_ROOT`, `MEDIA_BASE_URL`, Vietnam location API/cache variables.

Copy from the committed `.env.example` files into ignored local environment files. Never commit credentials or customer data.

## Current capabilities

- Dynamic product/category/collection/search storefront with bounded queries, reduced public payloads, ETag/conditional GET, in-worker cache, and cross-worker cache-version invalidation.
- Guest cart and hardened checkout with server-side quote, strict cart rules, action CAPTCHA, origin/rate-limit controls, voucher row locking, transactional order creation, idempotency, and email outbox.
- Storefront customer registration, email verification, login, password reset/change, sessions, addresses, order history, and admin CRM views.
- Admin authentication/RBAC and management for catalog, content, menus, banners, collections, vouchers, customers, orders, users, and roles.
- Signed search webhook with HMAC, timestamp, nonce, and replay prevention.
- Product media upload with content-signature validation and legacy metadata synchronization.

The additive admin migration was run against the configured local database on `2026-07-11`. It currently contains 280 tables: 152 InnoDB and 128 MyISAM. See the database docs before running any migration elsewhere.

## Verification status

The most recent local verification passed TypeScript, ESLint, production builds, 5 validation unit tests, the idempotency/rollback integration test, both npm audits with zero known vulnerabilities, readiness/liveness, and 13/13 local health checks.

The full 1,500-VU k6 test has not been run on a production-like 8 vCPU/16 GB host. Do not claim production capacity until that release gate passes.

## Documentation map

1. `AGENTS.md` — workspace rules for coding agents.
2. `AI_HANDOFF.md` — canonical current state and next actions.
3. `ARCHITECTURE.md` — runtime and data-flow design.
4. `PROJECT_PROGRESS.md` — progress, evidence, risks, backlog.
5. `SECURITY_AND_LOAD_MATRIX.md` — protection coverage and load gates.
6. App READMEs — application-specific behavior and commands.
7. `web-admin/database-docs/` — live schema, migrations, statistics, and query references.
