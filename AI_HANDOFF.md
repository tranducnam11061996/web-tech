# AI Handoff — HACOM Workspace

Last verified: `2026-07-13`

This is the canonical handoff for the next AI or engineer. Read `AGENTS.md` first, then this file, `ARCHITECTURE.md`, and `PROJECT_PROGRESS.md`.

## Current repository state

### `it_tech_db` cutover and PCMarket catalog import (applied)

- `web-admin` now owns a guarded `npm run import:legacy` workflow for `pcmarket/product-categories`. Dry-run is the default, writes no MySQL data, downloads/validates two complete snapshots, requires matching canonical SHA-256 hashes, saves the raw audit snapshot outside Git, and reports schema/route/dependency preflight.
- Apply is deliberately blocked without `ADMIN_WRITE_ENABLED=true`, exact database/hash, `REPLACE_PRODUCT_CATEGORIES`, full-backup acknowledgement, and maintenance-window acknowledgement. It uses an advisory lock, staging plus atomic category-table swap, per-run backups, source IDs as target IDs, safe HTML/URL normalization, deterministic duplicate-path resolution, old product/category detachment, and scoped configuration deactivation.
- Rollback restores the old category table, routes, product and attribute relations, product CSV, voucher/promotion/banner/menu/helper state, and cache versions. Backup tables are never removed automatically.
- Public category reads hide `status=0`, and category admin saves preserve safe legacy `.html`/`.html-1` paths. Product/category/search/recommendation lists also require `isOn=1`; direct product detail remains available for inactive products and identifies them as inactive.
- `web-admin/.env` is ignored by Git and now selects `mysql://root@localhost:3306/it_tech_db`; its persisted `ADMIN_WRITE_ENABLED` value is `false`. Local `next dev` also has `RECAPTCHA_DEVELOPMENT_BYPASS=true` so admin login can be tested without Google keys; the code ignores this bypass whenever `NODE_ENV=production`. The source `hanoi23_db` was read only and was not modified.
- Safe configuration bootstrap run `1` copied exactly 5,170 whitelisted rows: roles/admin, all menu versions/items, Vietnam province/ward sync data, shipping settings, and banner locations. The admin password hash was retained, while `must_change_password=1`, `last_login_at=NULL`, and `auth_version` was incremented. Sessions, audit logs, catalog/commerce/customer data, banner content, and catalog-bound configuration were not copied.
- Category import run `2` applied snapshot `feda1324a39499931996b31c10bab23472a63d3528c4a44173fcdd7c861d3abc`: 788 unique categories, 60 roots, source depth 3, 722 enabled/66 disabled, and 788 unique category routes.
- Product import run `3` applied stable composite snapshot `5f1f22c6756c862131f9f46926d9d3f4c47835159a82ad4fb70891fa0bd74021`: 4,712 store/price/info/search rows, 2,528 enabled/2,184 disabled, 415 zero-price products, 14,455 category links, 17,603 product-attribute links, 91 brands, 45 attributes, 426 values, and all 162 category-attribute links applied. The 102 empty source SKUs became unique `PCM-{id}` values. All product media remains remote HTTPS content on `pcmarket.vn`; no binary was downloaded.
- Brand sync run `5` applied stable snapshot `4ace3a4c0cc7ba7c2270e10463ce7f31e653d7c86915cdc2b13db6eeacf43eef`: all 91 source records are retained in audit, while runtime has 89 UTF-8 brands/info rows after `34 -> 25` (E-DRA) and `57 -> 31` (TEAMGROUP). No alias reference remains; `idv_brand_category` has 1,209 rows, search remains 4,712 rows, 13 PCMarket HTTPS logos remain remote, and homepage bootstrap exposes 80 enabled brands with enabled products. Run `4` was acceptance-tested, rolled back after detecting an incorrect denormalized product total, and superseded by corrected run `5`; keep both runs' backup tables.
- Run `3` keeps 11,735 variant references, 3 config occurrences, and 1,121 comboset occurrences in audit state `pending`; it did not populate config/combo runtime tables. Eight duplicate source paths were resolved deterministically with `-product-{id}`.
- Verified logical backups are retained outside Git under `D:\web-tech\tmp\db-backups`: the pre-bootstrap 285-table/0-row snapshot has manifest SHA-256 `e0def997f5c14c5e5d84a93c17f6ab103e97e6bd3182788c0bcc2b7f8caacefb`; the post-bootstrap 288-table/5,171-row snapshot has `105f7c6f311ef605f21f2139573c78313b2a9acdc8fd6c3f121e15e88c73b3cd`; the pre-product run artifact has `f632a4ea910ba8f20094f492ce6535192c77db185e8d6deb0587d87185486968`; and `it_tech_db-pre-brand-sync-2026-07-13T10-20-37-337Z.json` has manifest SHA-256 `312b0ac3eef985d621120ccd71b8d1cd12c569038f31b70d301c26a4a174d09d` (318 tables, 78,567 rows, one routine, two triggers). Every artifact was restored and compared in a disposable database that was dropped afterward.

### Performance and UX optimization pass (current working tree)

- Product detail now supports backward-compatible `include=full`, a storefront `include=core` path, and cached `/api/products/[slug]/supplemental`. The sample local observation was a 4,288-byte core at 14.7 ms cold/7.6 ms warm and a 9,335-byte supplemental response at 295.9 ms cold/12.4 ms warm.
- Public product cache now has configurable entry/byte budgets, negative caching, true stale-while-revalidate with one background flight, ETag/304, and safe `Server-Timing`.
- Token-protected runtime metrics, sampled Web Vitals telemetry, startup prewarm readiness, batched rate limiting, separate read/commerce/abuse k6 suites, bundle budgets, Lighthouse config, and Playwright/axe coverage are implemented.
- Browser calls are same-origin and server components use `API_INTERNAL_URL`. Quote requests debounce by 250 ms; image loading no longer preloads the same source in JavaScript; product carousel focus/reduced-motion behavior passed desktop and mobile E2E.
- Catalog verification passed 66/66 unit tests, category/product/brand disposable apply/rollback integration fixtures, the default integration suite, and both application typecheck/lint/build pipelines. Runtime healthcheck evidence is recorded below after the post-import restart.
- The strict release bundle budget still fails only product detail at 219.9 KB versus 205 KB (down from 233.6 KB); all commerce routes are below 170 KB. The full production-like 1,500-VU gate remains pending.
- Lighthouse CI is configured for the requested routes, but the local Windows Chrome run was inconclusive because temporary-profile cleanup failed with `EPERM`; do not treat it as Web Vitals release evidence.

- Real “Khuyến Mãi Sản Phẩm” support is implemented end to end. Admin CRUD manages display text, safe internal/HTTPS detail links, manual priority, Vietnam-time schedules, and union SKU/category scopes. Product detail embeds at most 50 active summaries, category roots include descendants dynamically, and the former five-item storefront demo has been removed.

- Product groups are now live end to end. The existing `config_group*` tables remain canonical, admin CRUD uses transactional reconciliation, and product detail embeds a bounded `productGroup` without a second storefront request. Each public SKU card carries its own resolved thumbnail (`proThum`, then legacy `image_collection` fallback); value image/color metadata has been removed from the admin contract and schema. Invalid legacy relations are filtered publicly and reported in admin rather than cleaned automatically.
- Real “Mua kèm giá sốc” support is implemented in the dirty worktree. `combo_set`/`combo_set_product` remain canonical; storefront reads only `web-admin` APIs and keeps a separate `hacom.combo-cart.v1` ID-only cart.
- The real product-detail combo selector chunks more than four combo groups into four-card slides. It uses the already embedded thumbnail of each group's first sellable SKU, keeps the group modal/quote flow intact, and does not make a new request until a shopper opens a group.
- `/gio-hang-combo` and `/thanh-toan-combo` now render in the standard dark commerce shell with the shared Header/Footer and checkout-style cards/forms. The combo promotion card is informational only; it does not read voucher state, the standard cart, or alter the Header badge.
- Product detail now receives bounded active voucher summaries resolved from `web_admin_vouchers` and category descendants. `ProductSidebar` hides only the voucher card when none apply, keeps the independent demo product-promotion list visible, exposes real codes/terms through an accessible lazy dialog, and leaves cart/order quote validation authoritative.
- Product detail now normalizes legacy `idv_sell_product_info.video_code` into a bounded safe YouTube embed list and exposes `hasSpecifications`. The gallery rail hides Video/Thông số utilities without matching data; video playback is lazy-modal only and the existing specification modal is opened directly from its utility card.
- Combo migration ran twice successfully on the identified local `hanoi23_db` on `2026-07-12`; the combo relation indexes and combo-order metadata columns/indexes are present. Product `87409` is intentionally not assigned automatically.
- API, storefront, and background worker were restarted against `it_tech_db`; runtime logs are under ignored `D:\web-tech\tmp\runtime-logs`. Post-brand-sync healthcheck passed 15/15 with category ID 30 and the documented collection-404 allowance. `/brand/intel`, `/brand/e-dra`, and `/brand/teamgroup` return 200; E-DRA reports 63 total/10 enabled products and TEAMGROUP 7/6.

- Branch before this uncommitted optimization pass: `main`, HEAD `d2e51b0` (`feat: complete catalog and commerce enhancements`).
- The working tree is intentionally dirty with this performance/UX implementation.
- Do not reset, checkout, clean, or overwrite these changes. Inspect `git status --short` and focused diffs before editing.
- Both applications now use Next.js `16.2.9` and React `19.2.4`.
- `web-admin` is the only MySQL owner. `font-end` consumes its APIs.
- `search-tool` is reference material; production search is under `web-admin/src/lib` and `/api/search`.

## What was just implemented

### Checkout, voucher, and order

- `POST /api/orders` validates a bounded body before acquiring a DB connection, verifies origin/CAPTCHA/rate limits, and requires `Idempotency-Key`.
- A single transaction performs final quote, voucher `FOR UPDATE` handling, order header, bulk order items, customer link/metrics, idempotency completion, and email outbox enqueue.
- Replaying the same key and payload returns the stored response; using the same key with another payload returns `409`.
- `POST /api/cart/quote` rejects invalid payloads instead of silently clamping. Cart limits are 50 distinct products and quantity 1–99.

### Customer and authentication

- Customer registration, verification, login, OTP resend, password reset/change, profile, addresses, and orders are implemented.
- Canonical Zod schemas normalize email, Vietnamese phone numbers, names, dates, passwords, addresses, and cart/order payloads.
- New password hashes use Argon2id; valid legacy bcrypt hashes are upgraded after login.
- Customer sessions have sliding idle expiry bounded by absolute expiry. Production cookie names prefer `__Host-*` and use `Secure`, `HttpOnly`, `SameSite=Lax`, path `/`.
- Action-specific reCAPTCHA v3 and atomic MySQL rate limits protect anonymous high-risk forms. CAPTCHA supports shadow mode for rollout.

### Public APIs, cache, and security

- Public read routes use reduced payloads, bounded filters/pages, weak ETags, `304` responses, and local single-flight caches.
- `web_admin_cache_versions` synchronizes invalidation across the two admin/API workers.
- Search prewarms at worker start and keeps the current index while rebuilding.
- Search webhook requires HMAC SHA-256 over `timestamp.nonce.rawBody`, a five-minute timestamp window, and a one-use nonce.
- Public write errors use `{ success:false, error:{ code, message, fields?, requestId } }`; responses carry `X-Request-ID`, and rate-limit responses carry `Retry-After`.
- Upload routes validate extension, declared MIME, binary image signature, size, randomized name, and containment under `MEDIA_ROOT`.

### Runtime and frontend

- The former hardcoded product color selector now renders real independent SKUs from the current product group. It hides below two valid sellable members, shows four cards per slide, uses each SKU's real thumbnail with a neutral missing-image fallback, marks the current SKU, and navigates other cards by their real product slug.
- Product and product-category editors now manage independent “Lý do nên mua” headings, introductions, and ordered accordion items through bounded admin APIs. The storefront receives this content only in `/api/products/[slug]`, hides empty/disabled guides, and does not render the component on search/homepage/news.
- Product, product-category, article, and news-category screens use the shared semantic `Breadcrumb` component. Backend payloads include a bounded `categoryTrail`, and `/api/news-category/[slug]` now joins legacy links by the real `article_id` column. `/` and `/tin-tuc` intentionally have no breadcrumb.
- Product detail now renders three independent related-content sections: category-ranked similar products, browser-local recently viewed products, and title-ranked related posts. Similar/posts ship with the cached product-detail payload; recently viewed cards refresh through one bounded `GET /api/products?ids=...` request and remain non-authoritative for checkout pricing.
- The storefront product-detail hero now uses a desktop `40/30/30` gallery/information/purchase grid, a two-column tablet reflow, and a single-column mobile flow. Cart, buy-now, combo sets, and product voucher discovery use live contracts; variant, favorite, and financing additions remain frontend-only demos.
- `Caddyfile` provides compression, security headers, body limits, proxy timeouts, and trusted forwarding behavior.
- `ecosystem.config.cjs` defines two `web-admin` workers, one storefront worker, and one background worker.
- The background worker sends transactional email outbox entries with retry/backoff and cleans expired rate-limit, idempotency, nonce, OTP, challenge, and session records in small batches.
- Local `web-admin npm run dev` starts Next.js and the background worker through `scripts/dev-with-worker.mjs`; `dev:api` remains available for deliberate API-only debugging. Production PM2 ownership is unchanged.
- Storefront checkout creates a UUID idempotency key per submission, gets CAPTCHA only at submit time, preserves form data on failure, and distinguishes validation, rate-limit, network, and system failures.
- Selected customer/checkout forms include bounded inputs, browser metadata, field error linkage, alert regions, keyboard focus handling, and double-submit protection.

## Database state

Read-only verification, most recently extended on `2026-07-12`, found:

- 285 tables total: 157 InnoDB, 128 MyISAM after the product-promotion migration on `2026-07-13`.
- The product image, managed menu, banner metadata, product-card rules, category feature, voucher, customer, idempotency, rate-limit, email outbox, cache-version, and webhook-nonce tables exist.
- Read-only breadcrumb analysis on `2026-07-12` found 28,764 products, 1,297 product categories, 2,642 articles, and 23 news categories. Product hierarchy depth is at most 6 and 97 product categories reference missing parents, so breadcrumb resolution intentionally returns a valid partial trail.
- The latest additive admin migration has been applied to the configured local database. Do not assume it has run on another environment.
- The buying-guide migration ran twice successfully against the identified local `hanoi23_db`; both UTF-8 InnoDB tables, their indexes, and the item-to-guide cascade were verified.
- The product-group index migration ran twice successfully on `hanoi23_db`; `uq_config_group_product_product(product_id)` enforces one group per product. Counts remained 1,972 groups, 1,813 attributes, 8,289 values, and 7,154 relations; known orphans were not deleted.

Important new infrastructure tables:

- `web_admin_order_requests`
- `web_admin_request_limits`
- `web_admin_email_outbox`
- `web_admin_cache_versions`
- `web_admin_webhook_nonces`
- `web_admin_vouchers`, `web_admin_voucher_categories`, `web_admin_voucher_redemptions`
- `web_admin_storefront_customers` and related password/session/OTP/address/order-link/metrics tables
- `web_admin_buying_guides`, `web_admin_buying_guide_items`
- `web_admin_product_promotions`, `web_admin_product_promotion_products`, `web_admin_product_promotion_categories`

## Code ownership map

| Concern | Primary owner |
|---|---|
| DB pool | `web-admin/src/lib/db.ts` |
| Request parsing/errors/origin | `web-admin/src/lib/publicRequest.ts` |
| Canonical commerce/customer validation | `web-admin/src/lib/commerceValidation.ts` |
| Rate limits, cleanup, cache versions, webhook nonces | `web-admin/src/lib/performanceInfrastructure.ts` |
| Order idempotency and outbox | `web-admin/src/lib/orderInfrastructure.ts` |
| Quote/order flow | `web-admin/src/lib/cart-quote.ts`, `web-admin/src/app/api/orders/route.ts` |
| Voucher transaction rules | `web-admin/src/lib/vouchers.ts` |
| Customer accounts/sessions | `web-admin/src/lib/customerAccounts.ts`, `/api/customer/*` |
| Search runtime | `web-admin/src/lib/publicSearch.ts`, `/api/search` |
| Dynamic category trails | `web-admin/src/lib/publicBreadcrumbs.ts`, `font-end/src/components/Breadcrumb.tsx` |
| Product related content | `web-admin/src/lib/publicRecommendations.ts`, product-detail API, three storefront related-content components |
| Checkout UI | `font-end/src/app/thanh-toan/CheckoutClient.tsx` |
| Runtime jobs | `web-admin/scripts/background-worker.ts` |

## Environment and rollout requirements

- Configure production `STOREFRONT_ORIGIN`, CAPTCHA site/secret keys, allowed hostnames, `SEARCH_WEBHOOK_SECRET`, database pool limits, SMTP, and media paths.
- Keep CAPTCHA in shadow mode first, inspect per-action metrics, then enable enforcement with backend and frontend in the same release.
- Default target topology is one 8 vCPU/16 GB machine with MySQL on the same host, Caddy, two API workers, storefront, and background worker.
- Each API worker defaults to 12 MySQL connections. Preserve at least 30% server connections for maintenance/migrations.

## Verification commands

```powershell
cd D:\web-tech\web-admin
npx.cmd tsc --noEmit
npm.cmd run lint -- --quiet
npm.cmd run test:unit
npm.cmd run test:integration
npm.cmd run build
npm.cmd audit
```

```powershell
cd D:\web-tech\font-end
npx.cmd tsc --noEmit
npm.cmd run lint -- --quiet
npm.cmd run build
npm.cmd audit
```

With both apps running:

```powershell
cd D:\web-tech\web-admin
npm.cmd run local:healthcheck
npm.cmd run local:benchmark
```

The current catalog passed 62/62 unit tests, disposable category and product apply/rollback integration, the default integration suite, both application typecheck/lint/build pipelines, and 13/13 runtime checks. An enabled SKU appears in search, an inactive SKU is excluded from search but its direct detail route returns HTTP 200 with `status=inactive`, and imported thumbnails remain absolute PCMarket HTTPS URLs. Collection definitions remain intentionally absent and their healthcheck routes return 404.

Observed local benchmark after payload reduction:

| Route/data | Result |
|---|---:|
| Products warm | ~3.1 ms |
| Search cold / warm | ~126 ms / ~2.0 ms |
| Homepage bootstrap warm | ~4.8 ms |
| Header payload | 99,097 → 51,415 bytes |
| Homepage bootstrap payload | 148,256 → 96,610 bytes |

These are local observations, not production SLO proof.

## Highest-priority next work

1. Reduce product-detail referenced client JS from 219.9 KB to the strict 205 KB release budget without changing the UI.
2. Deploy to an isolated production-like 8 vCPU/16 GB staging host and run `load:k6:read`, `load:k6:commerce`, and `load:k6:abuse`; retain k6, CPU, RAM, MySQL pool, slow-query, runtime metrics, and error metrics for the full ramp/hold test.
3. Verify reCAPTCHA hostname/action/score metrics in shadow mode, then explicitly enable enforcement.
4. Configure and test Caddy/PM2 process restart, graceful rollout, outbox retry, and cleanup behavior on the target OS.
5. Expand integration/E2E coverage across all write routes and all 15 forms, especially upload, admin RBAC, customer OTP/session revoke, concurrent voucher redemption, `429`, accessibility, and network failures.
6. Review remaining write routes against `SECURITY_AND_LOAD_MATRIX.md`; shared foundations exist, but do not assume every legacy admin form has canonical field-level Zod coverage.
7. Decide separately whether root scratch/debug files should be removed. Do not delete them as part of unrelated work.

## Release blocker

The full 1,500-VU, 150-RPS, up-to-10-checkout/s k6 scenario has not been run on a production-like host. Capacity is therefore **not yet certified**. If the target host misses the documented thresholds, record a capacity blocker and separate MySQL or add a second host; do not weaken the acceptance criteria.
