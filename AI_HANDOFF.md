# AI Handoff — HACOM Workspace

Last verified: `2026-07-13`

This is the canonical current-state handoff. Read `AGENTS.md` first, then this file, `ARCHITECTURE.md`, `PROJECT_PROGRESS.md`, and the README for the application being changed. Database work also requires `web-admin/database-docs/DATABASE_SCHEMA.md`; backup or machine-transfer work requires `web-admin/database-docs/DATABASE_TRANSFER.md`.

## Current repository state

- Repository: `tranducnam11061996/web-tech`.
- Branch: `main`.
- Current committed HEAD before this documentation pass: `6814c34` (`feat: import PCMarket catalog into it_tech_db`), synchronized with `origin/main`.
- The working tree was clean before this documentation pass. Do not discard new or unrelated changes; always inspect `git status` and the relevant diff.
- `web-admin` owns the admin UI, every API, MySQL access, migrations, importers, and the background worker.
- `font-end` owns the customer storefront and may consume only `web-admin` APIs.
- `search-tool` is a historical prototype. Production search is implemented in `web-admin`.

## Active runtime and data

The active local database is `it_tech_db`. The prior `hanoi23_db` remains available as the untouched legacy source and must not be changed by current work.

### PCMarket import runs

| Run | Entity | Status | Snapshot/result |
|---:|---|---|---|
| 1 | safe configuration from `hanoi23_db` | applied | 5,170 rows |
| 2 | product categories | applied | 788 source categories |
| 3 | products, original brands, attributes and values | applied | 4,712 products |
| 4 | brands | rolled back | retained recovery/audit data |
| 5 | corrected canonical brand sync | applied | 91 source records → 89 runtime brands |

Current catalog assertions:

- Categories: 788 unique IDs, 60 roots, maximum depth 3, 722 enabled and 66 disabled.
- Products: 4,712 store/price/info rows, 2,528 enabled and 2,184 disabled; 415 have price 0.
- Relations: 14,455 product-category, 17,603 product-attribute, and 162 category-attribute rows.
- Brands: 89 runtime brands and 89 `sellerId=0` info rows. Source IDs `34 → 25` (E-DRA) and `57 → 31` (TEAMGROUP) are durable many-to-one mappings.
- Search: 4,712 `product_data_search` rows and no missing product row at the latest catalog verification.
- Media: imported category/product/brand images remain absolute `https://pcmarket.vn/...` URLs. No PCMarket binaries were downloaded into the workspace or `MEDIA_ROOT`.
- Incomplete product variant/config/comboset references remain audit-only and pending; they are not runtime catalog configuration.
- Current `it_tech_db` has no collection, combo-set, product-group, voucher, product-promotion, buying-guide, or modern product-image metadata rows. Their code/schema may be implemented, but storefront sections correctly remain empty/404 until approved data is created or imported.

The database currently exposes 342 physical tables: 207 InnoDB and 135 MyISAM. The pre-import baseline was 285 tables; the 57 added tables are exactly 3 import audit/map tables plus 54 intentionally retained `web_admin_import_b_<run-id>_*` recovery tables. Do not treat 342 as the stable application schema or delete backup tables until import acceptance and a separate cleanup plan are approved.

## Implemented application surface

### Catalog and public storefront

- Dynamic home, category, product, collection, search, news, cart, checkout, customer-account, and brand pages.
- Public list/category/search/recommendation paths show enabled products only. An inactive product remains directly addressable and is returned with `status=inactive`; an inactive category returns a real 404.
- Canonical brand pages live at `/brand/[slug]`. E-DRA and TEAMGROUP aliases resolve to their canonical brands without duplicate homepage cards.
- Product detail supports sanitized description/specification HTML, absolute remote images, product groups, videos, vouchers, promotions, buying guides, recommendations, and related news.
- Public reads use bounded queries, reduced payloads, ETag/conditional GET, worker-local caches, and database-backed cache versions.

### Commerce and customers

- Guest cart quote and checkout recalculate price/status server-side and enforce origin, body, quantity, CAPTCHA, and rate limits.
- Voucher reservation/redemption, order creation, order items, customer order links/metrics, idempotency completion, and email outbox enqueue share the required InnoDB transaction.
- Combo cart/order flow has its own quote and order endpoints; incomplete imported PCMarket combosets are not silently activated.
- Storefront accounts support registration, email verification, login/logout, password reset/change, sessions, address management, and order history.

### Admin and operations

- Session-backed admin authentication, RBAC, forced password change, user/role management, and audit logging.
- Admin APIs and screens cover catalog, attributes, product groups, combos, content, banners, menus, collections, buying guides, product promotions, vouchers, customers, and orders. Some legacy screens remain less complete than their APIs; check the owning route before assuming parity.
- Public/admin uploads validate size and content signatures and store media outside Next.js under `MEDIA_ROOT`.
- Background work processes email outbox retries and expired runtime state.
- Health endpoints, internal metrics, signed search webhook, request IDs, safe error envelopes, replay prevention, and bounded in-memory caches are implemented.

## Code ownership map

| Concern | Primary location |
|---|---|
| Database pool | `web-admin/src/lib/db.ts` |
| Guarded legacy import CLI | `web-admin/scripts/import-legacy.ts` |
| Category/product/brand import logic | `web-admin/src/lib/legacyImport/` |
| Public product/search/brand reads | `web-admin/src/lib/productSearch.ts`, `web-admin/src/lib/publicBrands.ts`, public API routes |
| Request/error/origin contract | `web-admin/src/lib/publicRequest.ts` |
| Quote/order/voucher consistency | `web-admin/src/lib/cart-quote.ts`, `orderInfrastructure.ts`, `vouchers.ts`, order routes |
| Customer accounts/sessions | `web-admin/src/lib/customerAccounts.ts`, `/api/customer/*` |
| Cache/rate-limit/webhook infrastructure | `web-admin/src/lib/performanceInfrastructure.ts` |
| Storefront pages/components | `font-end/src/app`, `font-end/src/components` |
| Database schema/runbooks | `web-admin/database-docs/` |

## Runtime topology

Local development normally uses:

```text
web-admin :3000  -> admin UI + APIs + MySQL
font-end  :3001  -> storefront -> web-admin APIs
worker           -> email/retry/expiry jobs
```

The supplied one-host production shape uses Caddy, two clustered `web-admin` workers, one storefront worker, and one background worker. `ecosystem.config.cjs` and `Caddyfile` are deployment assets, not proof of production capacity.

## Environment and safety gates

- `web-admin/.env` is ignored and currently points local work at `it_tech_db`; never print or commit its credentials.
- The ignored local environment currently has `RECAPTCHA_DEVELOPMENT_BYPASS=true` so localhost admin/login tests do not fail for missing Google keys. The bypass is development-only and must be false in every production runtime.
- Administrative writes, migrations, importer apply, and importer rollback require `ADMIN_WRITE_ENABLED=true` plus their operation-specific database/hash/confirmation gates. Return the gate to `false` after the operation.
- `font-end` uses `NEXT_PUBLIC_API_URL`/`API_INTERNAL_URL`; it must never receive `DATABASE_URL`.
- Production needs real CAPTCHA, SMTP, origin, webhook, metrics, cookie, proxy, database-pool, and media settings. Development bypasses must remain off in production.
- Never run destructive integration tests against `it_tech_db` or `hanoi23_db`. They require an explicitly disposable database name and `LEGACY_IMPORT_DESTRUCTIVE_TEST=true`.

## Backup and transfer state

A full SQL migration archive for `it_tech_db` was generated on `2026-07-13` and restored successfully into a disposable local database. The verified artifact is outside Git under `D:\web-tech\tmp\db-backups`; its SHA-256 and exact procedure are recorded in `web-admin/database-docs/DATABASE_TRANSFER.md`. The archive includes schema, data, routine, and triggers. Keep the SQL/ZIP/manifest outside source control and verify the hash before moving it.

Earlier run-specific logical backups remain in the same ignored directory. Recorded manifests are: pre-bootstrap `e0def997f5c14c5e5d84a93c17f6ab103e97e6bd3182788c0bcc2b7f8caacefb`, post-bootstrap `105f7c6f311ef605f21f2139573c78313b2a9acdc8fd6c3f121e15e88c73b3cd`, pre-product `f632a4ea910ba8f20094f492ce6535192c77db185e8d6deb0587d87185486968`, and pre-brand `312b0ac3eef985d621120ccd71b8d1cd12c569038f31b70d301c26a4a174d09d`. Preserve them until the corresponding import runs are accepted and their rollback windows are explicitly closed.

The local phpMyAdmin export failure was caused by PHP's 1,000-input-variable limit on a 342-table export form. The host-local Laragon PHP setting was raised to 10,000 and Apache was restarted. CLI export remains the recommended transfer method because it is reproducible and avoids browser/PHP form limits.

## Verification evidence

Latest full catalog evidence recorded before this documentation pass:

- `web-admin`: TypeScript, ESLint, 66/66 unit tests, default integration suite, production build.
- Importers: category, product, and brand destructive apply/rollback fixtures passed in disposable databases.
- `font-end`: TypeScript, ESLint, production build.
- Runtime: 15/15 with `LOCAL_HEALTHCHECK_EMPTY_CATALOG=true`, including product detail/cart quote and public brand API/page; the flag currently permits the intentionally absent API/storefront collection routes to return 404.
- Database transfer: disposable restore matched 342 tables, 152,141 exact rows across all tables, 1 routine, 2 triggers, and critical counts 788/89/4,712/4,712.

This documentation pass reran `web-admin` unit tests (66 passed), the default integration suite (3 passed, 4 environment-gated fixtures skipped), and runtime health. Strict runtime mode passed 13/15 and failed only the two expected collection 404s; transitional mode passed 15/15. Historical checks are not substitutes for rerunning the required matrix after code changes.

## Required verification after meaningful code changes

```powershell
cd D:\web-tech\web-admin
npx.cmd tsc --noEmit
npm.cmd run lint -- --quiet
npm.cmd run test:unit
npm.cmd run test:integration
npm.cmd run build
```

```powershell
cd D:\web-tech\font-end
npx.cmd tsc --noEmit
npm.cmd run lint -- --quiet
npm.cmd run build
```

When both production servers are running, run `npm.cmd run local:healthcheck` from `web-admin`. A production-capacity claim additionally requires all k6 scenarios on an approved production-like staging host.

## Highest-priority next work

1. Import the missing variant/config-group/comboset definitions only after complete, validated source exports exist; reconcile their pending audit records explicitly.
2. Complete remaining admin UI/API parity, especially any modal or legacy screen still using placeholder/local-only behavior.
3. Run Playwright accessibility and performance-budget gates against the final runtime and fix any regressions.
4. Execute read, commerce, and abuse k6 scenarios on a production-like 8 vCPU/16 GB staging host; preserve metrics and database evidence.
5. Decide retention/cleanup policy for run-scoped import backup tables only after catalog acceptance and a tested restore path.

## Release blockers

- No production-capacity claim is valid until the full staging k6 gate passes.
- Production secrets, CAPTCHA mode, SMTP delivery, proxy/origin configuration, backup/restore, monitoring, TLS, cookie behavior, and MySQL capacity must be verified in the target environment.
- Pending PCMarket variant/config/comboset audit data is not a complete runtime implementation.
- A successful local SQL restore does not replace version-compatibility testing on the destination database server.
