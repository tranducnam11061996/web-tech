# AI Handoff — HACOM Workspace

Last verified: `2026-07-13`

This is the canonical handoff for the next AI or engineer. Read `AGENTS.md` first, then this file, `ARCHITECTURE.md`, and `PROJECT_PROGRESS.md`.

## Current repository state

- Real “Khuyến Mãi Sản Phẩm” support is implemented end to end. Admin CRUD manages display text, safe internal/HTTPS detail links, manual priority, Vietnam-time schedules, and union SKU/category scopes. Product detail embeds at most 50 active summaries, category roots include descendants dynamically, and the former five-item storefront demo has been removed.

- Product groups are now live end to end. The existing `config_group*` tables remain canonical, admin CRUD uses transactional reconciliation, and product detail embeds a bounded `productGroup` without a second storefront request. Each public SKU card carries its own resolved thumbnail (`proThum`, then legacy `image_collection` fallback); value image/color metadata has been removed from the admin contract and schema. Invalid legacy relations are filtered publicly and reported in admin rather than cleaned automatically.
- Real “Mua kèm giá sốc” support is implemented in the dirty worktree. `combo_set`/`combo_set_product` remain canonical; storefront reads only `web-admin` APIs and keeps a separate `hacom.combo-cart.v1` ID-only cart.
- The real product-detail combo selector chunks more than four combo groups into four-card slides. It uses the already embedded thumbnail of each group's first sellable SKU, keeps the group modal/quote flow intact, and does not make a new request until a shopper opens a group.
- `/gio-hang-combo` and `/thanh-toan-combo` now render in the standard dark commerce shell with the shared Header/Footer and checkout-style cards/forms. The combo promotion card is informational only; it does not read voucher state, the standard cart, or alter the Header badge.
- Product detail now receives bounded active voucher summaries resolved from `web_admin_vouchers` and category descendants. `ProductSidebar` hides only the voucher card when none apply, keeps the independent demo product-promotion list visible, exposes real codes/terms through an accessible lazy dialog, and leaves cart/order quote validation authoritative.
- Product detail now normalizes legacy `idv_sell_product_info.video_code` into a bounded safe YouTube embed list and exposes `hasSpecifications`. The gallery rail hides Video/Thông số utilities without matching data; video playback is lazy-modal only and the existing specification modal is opened directly from its utility card.
- Combo migration ran twice successfully on the identified local `hanoi23_db` on `2026-07-12`; the combo relation indexes and combo-order metadata columns/indexes are present. Product `87409` is intentionally not assigned automatically.
- Verification on 2026-07-13 passed both app typechecks/lints/builds, 43 web-admin unit tests, 4 integration tests, and local healthcheck 13/13.

- Branch at verification: `main`, HEAD `504d36e` (`feat: update storefront search vouchers and order management`).
- The working tree is intentionally dirty with a large set of user and AI changes spanning customer accounts, checkout, validation/security, public cache performance, runtime configuration, tests, and documentation.
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

The last run passed 40/40 unit tests, 4/4 integration tests, both typechecks/lints/builds, and 13/13 local health checks. Product-promotion integration covered idempotent migration, union-scope deduplication, priority ordering, rollback and delete cascade; desktop/mobile storefront screenshots verified the live `01` presentation. The earlier audits remained at zero known vulnerabilities but were not rerun for these dependency-neutral changes.

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

1. Deploy to an isolated production-like 8 vCPU/16 GB staging host and run `npm.cmd run load:k6`; retain k6, CPU, RAM, MySQL pool, slow-query, and error metrics for the full ramp/hold test.
2. Verify reCAPTCHA hostname/action/score metrics in shadow mode, then explicitly enable enforcement.
3. Configure and test Caddy/PM2 process restart, graceful rollout, outbox retry, and cleanup behavior on the target OS.
4. Expand integration/E2E coverage across all write routes and all 15 forms, especially upload, admin RBAC, customer OTP/session revoke, concurrent voucher redemption, `429`, accessibility, and network failures.
5. Review remaining write routes against `SECURITY_AND_LOAD_MATRIX.md`; shared foundations exist, but do not assume every legacy admin form has canonical field-level Zod coverage.
6. Decide separately whether root scratch/debug files should be removed. Do not delete them as part of unrelated work.

## Release blocker

The full 1,500-VU, 150-RPS, up-to-10-checkout/s k6 scenario has not been run on a production-like host. Capacity is therefore **not yet certified**. If the target host misses the documented thresholds, record a capacity blocker and separate MySQL or add a second host; do not weaken the acceptance criteria.
