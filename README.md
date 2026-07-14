# HACOM E-commerce Workspace

Last verified: `2026-07-15`

This workspace contains the HACOM storefront, admin dashboard, REST backend, background jobs, legacy MySQL integration, and deployment/load-test assets. AI agents should start with `AGENTS.md` and `AI_HANDOFF.md`. For another computer, use `NEW_MACHINE_SETUP.md`; a Git clone alone does not include the current uncommitted work, database, media, or secrets.

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
- `web-admin npm run dev` starts both the Next.js API/admin process and the email/background worker. Use `npm run dev:api` only for an intentional API-only session.

For the one-host production topology, use `Caddyfile` and `ecosystem.config.cjs`: Caddy terminates HTTP, two clustered `web-admin` workers serve APIs/admin, one storefront worker serves the UI, and one worker processes email outbox retries and expired runtime records.

## Required environment groups

- Database/runtime: `DATABASE_URL`, `ADMIN_WRITE_ENABLED`, `DB_CONNECTION_LIMIT`, `DB_QUEUE_LIMIT`, `DB_CONNECT_TIMEOUT_MS`.
- URLs/origins: `NEXT_PUBLIC_API_URL`, `STOREFRONT_ORIGIN`.
- CAPTCHA: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `RECAPTCHA_SCORE_THRESHOLD`, `RECAPTCHA_ALLOWED_HOSTNAMES`, `RECAPTCHA_SHADOW_MODE`.
- Security/integrations: `NEXTAUTH_SECRET`, `SEARCH_WEBHOOK_SECRET`, SMTP variables.
- Media/location: `MEDIA_ROOT`, `MEDIA_BASE_URL`, Vietnam location API/cache variables.

Copy from the committed `.env.example` files into ignored local environment files. Never commit credentials or customer data.

## Current capabilities

- Legacy-backed Product Group management and a detail-only storefront SKU selector with real slugs/prices, defensive orphan filtering, and four cards per slide.
- Dynamic product/category/collection/search storefront with bounded queries, reduced public payloads, ETag/conditional GET, in-worker cache, and cross-worker cache-version invalidation.
- Guest cart and hardened checkout with server-side quote, strict cart rules, action CAPTCHA, origin/rate-limit controls, voucher row locking, transactional order creation, idempotency, and email outbox.
- Storefront customer registration, email verification, login, password reset/change, sessions, addresses, order history, and admin CRM views.
- Admin authentication/RBAC and management for catalog, content, menus, banners, collections, vouchers, customers, orders, users, and roles.
- Real legacy-backed attribute CRUD with canonical stored value ApiKeys and shared category-filter eligibility.
- Draft/publish Header, Homepage, Footer, and Bottom Footer menus with public ETags and storefront fallback data.
- Guarded PCMarket importers for categories, products, brands, attributes, routes, search rows, audit records, and run-scoped rollback backups. The active catalog keeps absolute HTTPS images on `pcmarket.vn`.
- Canonical public brand pages and homepage brand data; duplicate source identities E-DRA and TEAMGROUP are merged through durable source-to-target mappings.
- Display-only product-promotion management with union SKU/category scopes, descendant matching, scheduling, manual priority, safe detail links, and live product-detail rendering.
- Signed search webhook with HMAC, timestamp, nonce, and replay prevention.
- Product media upload with content-signature validation and legacy metadata synchronization.

The active local database is `it_tech_db`; `hanoi23_db` is retained as the untouched legacy source. The accepted post-favorites state contains 788 categories, 90 runtime brands, 4,712 products/search rows, 4 news categories, and 668 articles. It has 289 physical tables (161 InnoDB and 128 MyISAM), zero Latin-1/utf8mb3 columns, and no importer recovery/stage/restore tables. Recovery for accepted runs 2–8 depends on external restore-verified artifacts. Table count alone is not the stable schema contract; see the database docs before any migration, cleanup, or restore.

## Verification status

The `2026-07-15` audit passed TypeScript, ESLint, and production builds in both apps, 104/104 web-admin unit tests, 6 integration tests with 7 explicit fixture/safety skips, and npm audit with zero known vulnerabilities. Runtime health was 13/15 in strict mode and 15/15 with `LOCAL_HEALTHCHECK_EMPTY_CATALOG=true`; both strict failures are the intentionally absent collection API/page. The focused new Playwright specs passed with one worker, but the full 12-worker run was resource-inconclusive. Current frontend JS regression/release budgets fail on multiple routes. See `PROJECT_AUDIT_2026-07-15.md` for exact evidence.

A full SQL migration archive was generated and restored into a disposable database on `2026-07-13`; schema objects and critical catalog counts matched before the disposable database was removed. This proves that archive's local restore path, not production capacity or compatibility with every MySQL/MariaDB version.

The full 1,500-VU k6 test has not been run on a production-like 8 vCPU/16 GB host. Do not claim production capacity until that release gate passes.

## Documentation map

1. `AGENTS.md` — workspace rules for coding agents.
2. `AI_HANDOFF.md` — canonical current state and next actions.
3. `NEW_MACHINE_SETUP.md` — safe source/database/media/secret transfer and destination bootstrap.
4. `PROJECT_AUDIT_2026-07-15.md` — latest whole-workspace audit evidence and findings.
5. `ARCHITECTURE.md` — runtime and data-flow design.
6. `PROJECT_PROGRESS.md` — progress, evidence, risks, backlog.
7. `SECURITY_AND_LOAD_MATRIX.md` — protection coverage and load gates.
8. App READMEs — application-specific behavior and commands.
9. `web-admin/database-docs/` — live schema, migrations, statistics, query references, and the verified database transfer procedure.
