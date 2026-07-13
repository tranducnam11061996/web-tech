# HACOM Backend API and Admin Dashboard

Last verified: `2026-07-13`

`web-admin` is a Next.js 16.2.9 application that owns the admin UI, all REST APIs, all MySQL access, media serving, migrations, and background jobs. Read root `AGENTS.md` and `AI_HANDOFF.md` first.

## Combo commerce

Admin combo APIs support create/update plus product relation remove/reorder. Public combo endpoints are `GET /api/combo-sets/[setId]/groups/[groupIndex]`, `POST /api/combo-cart/quote`, and `POST /api/combo-orders`. Run `npm run admin:migrate` only with an identified database and explicit `ADMIN_WRITE_ENABLED=true`; it adds required indexes/metadata, force-removes obsolete Product Group value visual columns, but does not clean legacy relation orphans or assign combo data.

## Responsibilities

- Public storefront APIs for catalog, categories, collections, content, menus, banners, search, quote, and order creation.
- Customer APIs for authentication, profile, addresses, locations, and order history.
- Authenticated/RBAC-protected admin APIs and screens for catalog, content, commerce, users, roles, and customer CRM.
- MySQL connection pool, legacy schema integration, additive `web_admin_*` tables, cache invalidation, and search infrastructure.
- Transactional email outbox, expired-record cleanup, readiness/liveness, and media serving.

## Environment

Use `.env.example` as the authoritative key list. Major groups:

- `DATABASE_URL`; optional pool tuning via `DB_CONNECTION_LIMIT`, `DB_QUEUE_LIMIT`, `DB_CONNECT_TIMEOUT_MS`.
- `ADMIN_WRITE_ENABLED` for write APIs/migrations. Migration commands intentionally fail unless it is exactly `true`.
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `STOREFRONT_ORIGIN`.
- `RECAPTCHA_SECRET_KEY`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, score/hostname/shadow/bypass controls.
- `SEARCH_WEBHOOK_SECRET`.
- SMTP/outbox variables and `BACKGROUND_WORKER_POLL_MS`.
- `MEDIA_ROOT`, `MEDIA_BASE_URL`, and Vietnam location provider/cache variables.

Never put real secrets into committed examples or logs.

## Commands

```powershell
npm.cmd run dev
npm.cmd run dev:clean
npm.cmd run build
npm.cmd run start
npm.cmd run lint -- --quiet
npx.cmd tsc --noEmit
```

`npm run dev` starts Next.js and the background email worker together; both share the terminal and stop together on `Ctrl+C`. Use `npm run dev:api` for an intentional API-only session, or `npm run worker:background` to run only the worker. Inspect pending delivery in `web_admin_email_outbox`; never mark an email as sent manually.

```powershell
npm.cmd run admin:migrate
npm.cmd run admin:access-migrate
npm.cmd run admin:bootstrap
npm.cmd run locations:sync
npm.cmd run search:migrate
npm.cmd run search:rebuild
npm.cmd run search:test-ranking
```

```powershell
npm.cmd run worker:background
npm.cmd run local:healthcheck
npm.cmd run local:benchmark
npm.cmd run storefront:benchmark
npm.cmd run db:indexes
npm.cmd run db:explain-hot
npm.cmd run test:unit
npm.cmd run test:integration
npm.cmd run load:k6
```

Run `load:k6` only against an approved isolated target. It is not a local smoke test.

## PCMarket legacy category import

The active local database is configured in the ignored `.env` as `it_tech_db`; keep the persisted write gate `false`. `hanoi23_db` is a retained read-only source. Bootstrap approved non-catalog configuration only after confirming the target business tables are empty:

```powershell
npm.cmd run db:bootstrap-safe-config -- --source-database=hanoi23_db --target-database=it_tech_db --dry-run
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run db:bootstrap-safe-config -- --source-database=hanoi23_db --target-database=it_tech_db --apply --expected-hash=<sha256> --confirm=COPY_SAFE_CONFIGURATION
```

Create a logical artifact and require a successful disposable restore before acknowledging backup readiness:

```powershell
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run db:logical-backup -- --database=it_tech_db --label=<label> --output-dir=D:\web-tech\tmp\db-backups --verify-restore
```

The importer is read-only by default. It downloads the source twice, validates every page with Zod, canonicalizes records by ID, requires matching SHA-256 hashes, stores the raw snapshot under the ignored `var/imports` directory, and runs target-schema/route preflight without writing MySQL:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=product-categories --dry-run
```

Apply is a full category replacement and must run only after a full MySQL backup in an approved maintenance window. It preserves source category IDs, atomically swaps a populated staging table, detaches existing products, stages category-attribute links as pending import records, disables category-scoped voucher/promotion/banner/menu behavior, bumps shared caches, and retains every per-run backup table:

```powershell
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=product-categories --apply --expected-database=<name> --expected-hash=<sha256> --confirm=REPLACE_PRODUCT_CATEGORIES --backup-confirmed --maintenance-window
```

Rollback also requires the write gate and exact database name:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=product-categories --rollback --run-id=<id> --expected-database=<name>
```

Do not delete `web_admin_import_b_<run-id>_*` tables until acceptance. Restart API/background workers after apply or rollback. The category integration test is skipped unless `LEGACY_IMPORT_TEST_DATABASE_URL` points to a disposable database whose name contains `test`, `import`, or `disposable`, and `LEGACY_IMPORT_DESTRUCTIVE_TEST=true`.

Local cutover completed on `2026-07-13`: safe configuration is run `1`, PCMarket categories are run `2`, and PCMarket products are run `3`. Never reuse a documented snapshot hash for another apply because the source may change; use the hash printed by the immediately preceding dry-run.

## PCMarket legacy product import

The product entity imports the product, brand, and attribute exporters as one stable composite snapshot. It is dry-run by default and requires an empty target catalog plus the already imported 788 categories:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=products --dry-run --expected-database=it_tech_db
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=products --apply --expected-database=it_tech_db --expected-hash=<fresh-composite-sha256> --confirm=IMPORT_PCMARKET_PRODUCTS --backup-confirmed --maintenance-window
```

Rollback requires the write gate and the applied run ID:

```powershell
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=products --rollback --run-id=3 --expected-database=it_tech_db
```

Run `3` applied hash `5f1f22c6756c862131f9f46926d9d3f4c47835159a82ad4fb70891fa0bd74021`. Media remains on `https://pcmarket.vn`; variants, config groups, and combosets without complete source contracts remain pending audit data. Set the process write gate back to `false` after apply/rollback and retain all snapshot/backup artifacts until acceptance.

## PCMarket legacy brand sync

The standalone brand entity preserves remote `https://pcmarket.vn/...` logos, merges source IDs 34/57 into canonical IDs 25/31, converts the two live brand tables to UTF-8, refreshes product references/search/cache state, and retains all 91 source records in audit:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=brands --dry-run --expected-database=it_tech_db
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=brands --apply --expected-database=it_tech_db --expected-hash=<fresh-sha256> --confirm=SYNC_PCMARKET_BRANDS --backup-confirmed --maintenance-window
npm.cmd run import:legacy -- --source=pcmarket --entity=brands --rollback --run-id=<id> --expected-database=it_tech_db
```

Applied run `5` uses hash `4ace3a4c0cc7ba7c2270e10463ce7f31e653d7c86915cdc2b13db6eeacf43eef`. Run `4` is intentionally retained as `rolled_back` after an acceptance correction. Rollback run `5` before attempting to roll back product run `3`; later applied import runs block brand rollback.

The post-import runtime healthcheck uses category ID 30. Set `LOCAL_HEALTHCHECK_EMPTY_CATALOG=true` only to accept the expected collection 404s (collection definitions were not imported); product list/search/detail and cart quote still run and must pass:

```powershell
$env:LOCAL_HEALTHCHECK_CATEGORY_ID='30'
$env:LOCAL_HEALTHCHECK_EMPTY_CATALOG='true'
npm.cmd run local:healthcheck
```

## API groups

### Public reads

Product-detail performance contracts:

- `GET /api/products/[slug]?include=full` is the backward-compatible default.
- `GET /api/products/[slug]?include=core` omits below-the-fold recommendations, posts, and buying-guide data.
- `GET /api/products/[slug]/supplemental` returns deferred content with its own cache and ETag.
- Product caches use `PUBLIC_CACHE_MAX_ITEMS`/`PUBLIC_CACHE_MAX_BYTES`, negative TTLs, true stale-while-revalidate, and DB-version invalidation.
- `/api/internal/metrics` requires `INTERNAL_METRICS_TOKEN` in production. `/api/telemetry/web-vitals` accepts only bounded, same-origin, non-PII batches.

- `/api/products/[slug]` optionally embeds a bounded `productGroup` for the current sellable SKU. Group items include each SKU's thumbnail, resolved from `proThum` with a legacy `image_collection` fallback; attribute value visual metadata is not exposed. Product-group data is intentionally absent from lists, search, categories, homepage, and news.
- `/api/products`, `/api/products/[slug]`, `/api/search`, `/api/search-attributes`.
- `/api/brands/[slug]` returns canonical brand metadata, enabled products, price bounds, sort and pagination.
- `/api/categories/*`, `/api/collections/[slug]`.
- `/api/homepage/bootstrap`, `/api/menu/header`, `/api/menu/homepage`.
- `/api/banners/homepage`, `/api/banners/global`, `/api/banners/location/[locationKey]`.
- `/api/news/[slug]`, `/api/news-category/[slug]`, `/api/media/[...path]`.

Product detail/category responses and news detail/category responses include `categoryTrail: Array<{ id, name, slug }>` for storefront breadcrumbs. `/api/products?category_id=...` exposes the same trail under `layoutMeta.categoryTrail`. Trails are resolved from the legacy hierarchy with bounded recursion, cycle protection, partial results for missing parents, and legacy-link fallbacks; no storefront route reads MySQL directly.

Product-detail responses also include up to 15 `similarProducts` (leaf category first, direct-parent fallback only when fewer than five leaf matches) and up to five title-ranked `relatedPosts`. `GET /api/products?ids=1,2,...` accepts at most 15 unique positive IDs and returns active product cards in request order for browser-local recently viewed history; this private-cache branch bypasses the shared product-response LRU.

`GET /api/products/[slug]` also returns an optional `buyingGuide` only for product/product-category detail payloads. The bounded guide is embedded in the existing cached response; list, search, homepage, and news routes do not query or expose it.

Product detail also returns up to 50 active, in-window, non-exhausted voucher summaries whose category roots contain the product; vouchers without category links apply globally. Public summaries omit quota/redemption/admin data, and `POST /api/cart/quote` plus `POST /api/orders` remain authoritative.

Product detail returns `productPromotions` with at most 50 active display-only records. Direct SKU and category-root scopes are combined with OR, category roots include descendants dynamically, duplicates are removed, and ordering is manual priority then end time then id. Promotions never affect quote or order totals.

Public read APIs use bounded inputs, reduced response shapes, local single-flight caches, ETags, and cross-worker invalidation where applicable.

### Commerce writes

- `POST /api/cart/quote`: validates up to 50 distinct products with integer quantity 1–99; never trusts client prices.
- `POST /api/orders`: requires storefront origin, `recaptchaToken`, and an `Idempotency-Key` UUID-like value.

Order creation performs final quote, voucher locking, order/items, customer link/metrics, idempotency completion, and email outbox enqueue in one transaction. Email delivery occurs asynchronously after commit.

### Customer

- `/api/customer/auth/register`, `/verify-email`, `/resend-verification`, `/login`, `/logout`.
- `/api/customer/auth/forgot-password/request`, `/confirm`, `/change-password`.
- `/api/customer/me`, `/addresses`, `/orders`, and `/locations/*`.

Anonymous high-risk actions use action-specific reCAPTCHA and IP/identifier rate limits. Authenticated writes use customer session, origin/ownership checks, and route limits.

### Admin

Admin API groups live under `/api/admin/*`. Mutations require authenticated session, RBAC permission, same-origin handling, audit behavior where applicable, and `ADMIN_WRITE_ENABLED=true`. Do not add CAPTCHA to ordinary post-login admin forms; use re-authentication or step-up controls only for sensitive/risky actions.

Product and category editors manage independent buying guides through `GET/PUT /api/admin/products/[id]/buying-guide` and `GET/PUT /api/admin/product-categories/[id]/buying-guide`. PUT replaces the bounded ordered item list in one transaction and invalidates only catalog-detail response caches.

Product groups are managed through `GET/POST /api/admin/product-groups`, `GET/PUT/DELETE /api/admin/product-groups/[id]`, and the existing product catalog with assignment filters. Value payloads contain only identity, name, description, and ordering; legacy value image/color fields are rejected. Writes reconcile legacy IDs and PHP-serialized SKU mappings in one transaction; each product may belong to only one group.

Product promotions are managed through `GET/POST /api/admin/product-promotions` and `GET/PUT/DELETE /api/admin/product-promotions/[id]`. Writes require `marketing.product_promotions` permissions and `ADMIN_WRITE_ENABLED=true`, replace SKU/category scopes transactionally, validate internal/HTTPS links and Vietnam-time ranges, and invalidate catalog-detail caches.

### Health and webhook

- `GET /api/health/live`: process liveness.
- `GET /api/health/ready`: DB and required runtime-table readiness.
- `POST /api/webhook/update-search`: requires `X-Webhook-Timestamp`, `X-Webhook-Nonce`, and `X-Webhook-Signature`.

Signature input is `${timestamp}.${nonce}.${rawBody}` using HMAC SHA-256 with `SEARCH_WEBHOOK_SECRET`. Reject stale timestamps and reused nonces.

## Public error contract

Hardened public write routes return:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Vietnamese user-facing message",
    "fields": { "field": "Field error" },
    "requestId": "correlation id"
  }
}
```

Responses include `X-Request-ID`. Rate-limit responses use HTTP `429` plus `Retry-After`. Never return raw exceptions or SQL details.

## Password, session, and CAPTCHA rules

- New customer/admin password hashes use Argon2id. Continue reading bcrypt hashes and rehash after successful verification.
- Store only hashed session/OTP/idempotency/rate-limit identifiers where designed.
- Production session cookies are `Secure`, `HttpOnly`, `SameSite=Lax`, path `/`, and prefer `__Host-*` names.
- reCAPTCHA verification checks success, expected action, configurable score, allowed hostname, and two-minute challenge age. Use shadow mode before production enforcement.

## Cache and search

- Worker-local public caches are bounded and use normalized keys.
- `web_admin_cache_versions` propagates invalidation between clustered API workers.
- Search prewarms at process start and uses single-flight/stale data during rebuild.
- `product_data_search`, its normalize function, triggers, and FK remain part of the production search contract.
- `search-tool` is not runtime code.

## Upload rules

- Resolve all destinations under `MEDIA_ROOT` and use randomized file names.
- Enforce body/file size, extension allowlist, declared MIME, and binary image signature.
- Product albums support `product`, `self`, and `customer`; keep legacy thumbnail/image collection/count synchronized while legacy readers exist.

## Database status

The additive admin migration was run on the configured local database. Read-only verification on `2026-07-13` found 285 tables: 157 InnoDB and 128 MyISAM, including the product-promotion, buying-guide, customer, voucher, idempotency, rate-limit, outbox, cache-version, webhook-nonce, media, menu, and content helper tables.

This does not prove migration state in any other environment. Follow `database-docs/ADMIN_MIGRATION_GUIDE.md`.

## Verification status

Latest importer verification passed both application TypeScript/ESLint/build pipelines, 55 web-admin unit tests, and the 4 existing DB integration tests; the new destructive category swap/rollback integration test was safely skipped because no disposable test database was opted in. Dependency installation/audit reported zero known vulnerabilities. Healthcheck was not rerun because ports 3000/3001 were not running; the prior 13/13 result remains historical, not evidence for this change. Full 1,500-VU target testing remains pending.
