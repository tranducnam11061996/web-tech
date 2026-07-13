# Changelog

Notable workspace changes are grouped by implementation/audit date.

Historical entries describe the state on their own date. Use `AI_HANDOFF.md` and `PROJECT_PROGRESS.md`, not an older “Known Gaps” section, for current status.

## 2026-07-13

### Legacy brand sync

- Added independent guarded `pcmarket/brands` dry-run/apply/rollback with two-snapshot stability checks, raw audit snapshots, source-authoritative normalization, target-only preservation, exact database/hash/confirmation gates, advisory locking, and run-scoped backups.
- Canonicalized E-DRA `34 -> 25` and TEAMGROUP `57 -> 31` in both brand and future product imports. Brand/info staging uses `utf8mb4_unicode_ci`; `idv_brand_category` and `idv_movie` use compensating atomic swaps while product references update transactionally and search/cache state is refreshed.
- Added `GET /api/brands/[slug]`, canonical brand fields on product detail, real homepage brand bootstrap/cards, storefront `/brand/[slug]`, remote logo rendering in admin, and brand API/page healthchecks.
- Verified the 318-table/78,567-row pre-brand backup and manifest `312b0ac3eef985d621120ccd71b8d1cd12c569038f31b70d301c26a4a174d09d` through a disposable restore. Destructive brand apply/rollback also passed on a cloned disposable database.
- Run `4` was rolled back after runtime acceptance found an ambiguous product-count aggregation. Corrected run `5` applied hash `4ace3a4c0cc7ba7c2270e10463ce7f31e653d7c86915cdc2b13db6eeacf43eef`: 89 brands/info rows, 1,209 brand-category rows, 13 remote logos, 91 audit records, 4,712 search rows, 80 homepage brands, and zero runtime/reference IDs 34/57. E-DRA verifies at 63 total/10 enabled and TEAMGROUP at 7/6.
- Final verification passed 66/66 unit tests, the default integration suite, the opt-in destructive brand test, both application typecheck/lint/build pipelines, and 15/15 runtime checks.

### Legacy product import

- Extended `import:legacy` with a guarded `pcmarket/products` workflow that fetches two stable bounded snapshots from product, brand, and attribute endpoints, validates them with Zod, normalizes SKU/path/VAT/category/attribute/media data, sanitizes HTML, and stores raw audit snapshots outside Git.
- Added product apply/rollback with exact database/hash confirmation, schema and empty-catalog preflight, advisory locking, run-scoped backups, transactional InnoDB writes, compensating MyISAM `idv_brand_category` swap, search infrastructure installation, cache-version invalidation, and pending audit records for incomplete variants/config/combosets.
- Product run `3` applied composite SHA-256 `5f1f22c6756c862131f9f46926d9d3f4c47835159a82ad4fb70891fa0bd74021` to `it_tech_db`: 4,712 products/routes/search rows, 14,455 product-category links, 17,603 product-attribute links, 91 brands, 45 attributes, 426 values, and 162 category-attribute links. The source status split is 2,528/2,184 and 415 products retain zero price.
- Added a shared absolute/legacy image resolver across admin, public API, search, cart, combo, and recommendation paths, plus `pcmarket.vn` Next.js remote-image permission in both apps. Product binaries were not downloaded.
- Retained 11,735 variant references, 3 config occurrences, and 1,121 comboset occurrences as pending audit data. Eight duplicate product URLs use deterministic `-product-{id}` paths and 102 empty SKUs use unique `PCM-{id}` fallbacks.
- A full 305-table/8,341-row pre-import backup was restored and hash-verified in a disposable database. Verification passed 62/62 unit tests, the product destructive apply/rollback fixture, the default integration suite, and both application typecheck/lint/build pipelines.
- Restarted web-admin, storefront, and the background worker against `it_tech_db`; the post-import runtime healthcheck passed 13/13. Enabled product search, inactive-product search exclusion/direct detail state, cart quote, and absolute PCMarket thumbnails were verified. Collection routes remain intentionally 404 because collection definitions were not in the approved import scope.

### Legacy category import

- Switched the ignored local runtime configuration to `it_tech_db` without changing the source fallback or committed database placeholder. Added guarded `db:bootstrap-safe-config` and `db:logical-backup` commands, including whitelist schema/hash checks, FK-safe transactional copy, MyISAM compensation, admin first-login hardening, run-ID rollback, SHA manifests, and disposable restore verification.
- Safe-config run `1` copied 5,170 approved rows from read-only `hanoi23_db`. Verified pre-bootstrap and post-bootstrap backup manifests are retained under `D:\web-tech\tmp\db-backups`; their restore-test databases were dropped.
- Destructive category apply/rollback passed against disposable `it_tech_db_import_test`; the database was dropped after the test. Category run `2` then imported the stable 788-row snapshot into `it_tech_db`, producing 788 unique routes and 162 pending attribute links while leaving product and attribute relations empty.
- Added `LOCAL_HEALTHCHECK_EMPTY_CATALOG=true` so the local runtime probe accepts the documented empty/404 collection state during the category-only phase while leaving default healthcheck behavior unchanged.
- Added a lightweight category route-status API plus storefront pre-render guard so inactive categories return an actual HTTP 404 instead of a streamed 200 response carrying a 404 fallback. Runtime verification passed enabled and legacy `.html` routes at 200, inactive ID 447 at 404, and the empty-catalog healthcheck at 11/11.

- Added a reusable guarded legacy-import command and the PCMarket product-category adapter with bounded HTTPS pagination, Zod validation, retry/backoff, two-snapshot SHA-256 stability checks, ignored raw audit snapshots, tree/path validation, safe HTML normalization, and deterministic duplicate-route resolution.
- Added InnoDB import audit/mapping tables, schema/engine/FK/trigger/route/field preflight, advisory locking, category staging and atomic table swap, run-scoped backups, old product/attribute relation detachment, scoped voucher/promotion/banner/menu/helper deactivation, cache-version bumps, and run-ID rollback.
- Public category child/detail reads now reject inactive categories; category admin saves preserve safe legacy `.html` paths. Source attribute links remain pending until the full attribute export is available.
- Added pure unit coverage plus destructive integration coverage that is disabled unless an explicitly disposable database and opt-in flag are supplied.
- The earlier `hanoi23_db` preflight conflict did not exist in the empty `it_tech_db` route table. The apply used the fresh immediately preceding dry-run hash `feda1324a39499931996b31c10bab23472a63d3528c4a44173fcdd7c861d3abc`; future runs must still use a fresh hash.
- Verification passed 55/55 unit tests, all 4 existing database integration tests, and both application typecheck/lint/build pipelines. The destructive category cutover integration test remained skipped without a disposable opt-in database; healthcheck was not run because production servers were not listening.

### Fixed

- Enabled the existing development-only reCAPTCHA bypass in the ignored local `web-admin/.env` and restarted the port-3002 dev runtime. An empty-token login probe now reaches credential validation (`401 INVALID_CREDENTIALS`) instead of failing with `503 BOT_PROTECTION_UNAVAILABLE`; production continues to require real Google reCAPTCHA keys.
- Restored category-page development rendering by allowing `unsafe-eval` only in the storefront development CSP; production CSP remains unchanged.

### Added

- Removed an unreachable product bundle demo that Turbopack still emitted, replaced hydrated product description/specification state with accessible native disclosures/dialog behavior, and reduced product-detail referenced client JS from 233.6 KB to 219.9 KB without removing a visible section.
- Added backward-compatible product core/supplemental contracts, ETag/304, byte-bounded true stale-while-revalidate, negative caching, safe route timing, protected runtime metrics, and sampled Web Vitals telemetry.
- Added same-origin storefront API usage with server-only `API_INTERNAL_URL`, 250 ms quote debounce/stale-response protection, deferred recently-viewed loading, server-rendered related product cards, native accessible accordions, reduced-motion carousel controls, loading/error/404 states, and contrast/accessibility corrections.
- Added split read/commerce/abuse k6 suites, corrected storefront benchmarks, regression/strict bundle budgets, Lighthouse configuration, and Playwright/axe desktop/mobile coverage.

- Added three additive InnoDB product-promotion tables with safe detail URLs, manual ordering, optional UTC validity ranges, direct SKU scope, category-root scope, and cascading helper-table relations.
- Added RBAC-protected admin CRUD at `/sales/product-promotions`, including searchable/filterable status views, persistent paginated SKU selection, reusable descendant-aware category selection, storefront preview, and permanent-delete confirmation/audit.
- Embedded up to 50 active product promotions in the existing product-detail payload and replaced the five hardcoded storefront rows with zero-padded live results and safe internal/external links.
- Added unit coverage for URL, scope, time, state and cyclic-category behavior plus integration coverage for idempotent migration, mixed-scope deduplication, priority ordering, rollback and delete cascade.
- Added safe parsing of legacy PHP-serialized product `video_code` into bounded YouTube-nocookie embeds in product-detail payloads. Gallery Video/Thông số utilities now appear only for available data; video playback is a lazy accessible modal with finite previous/next navigation, while the existing specification modal opens directly from its utility card.

### Verified

- Optimization verification passed 46 unit tests, 4 integration tests, both TypeScript/lint/build pipelines, 13/13 local health checks, dependency audits, regression bundle budgets, and four desktop/mobile Playwright/axe scenarios. Product core measured 4,288 bytes; the strict 205 KB product-detail JS target and full staging k6 gate remain pending.

- Product-promotion migration completed twice on identified local `hanoi23_db`; the database now contains 285 tables (157 InnoDB, 128 MyISAM), relation indexes/FKs and role grants were verified, and integration fixtures were removed.
- Both applications passed TypeScript, ESLint `--quiet`, and production builds; backend tests passed 43/43 unit and 4/4 integration, local healthcheck passed 13/13, and fresh desktop/mobile storefront screenshots verified the live numbered block.

## 2026-07-12

### Added

- Completed legacy-backed Product Groups: bounded admin list/editor/product picker, transactional attribute/value/SKU reconciliation, PHP config normalization, and detail-cache invalidation.
- Embedded sellable group SKU cards only in `GET /api/products/[slug]`; the storefront hides incomplete groups and renders an accessible four-items-per-slide selector with real prices and slugs.
- Changed group-card visuals to use the corresponding SKU thumbnail (`proThum`, then legacy `image_collection`) rather than attribute value images or color swatches; a neutral fallback covers missing/broken SKU media.
- Removed legacy Product Group value `image` and `color_code` fields from the editor, admin API contract, and `config_group_attribute_value`; the idempotent forced-drop migration reported zero discarded local values.
- Added the idempotent `uq_config_group_product_product(product_id)` migration with a duplicate preflight and no orphan cleanup.
- Replaced product-detail voucher demo data with bounded live summaries from the InnoDB voucher tables, including global/category-descendant eligibility, active-time/quota filtering, real discount terms, and product-detail cache invalidation.
- Added an accessible lazy-loaded voucher list/detail dialog with code copying, and category-scope visibility in the admin voucher list.
- Implemented real legacy-backed combo sets end to end: bounded admin CRUD and relation ordering/removal, public group/quote APIs, product-detail summaries, a separate combo cart and checkout, transactional combo orders, admin identification, and combo-aware email output.
- Updated the real product-detail “Mua kèm giá sốc” selector to paginate more than four combo groups into accessible four-card slides using each group's existing first-SKU thumbnail; group product details remain lazy-loaded only on selection.
- Added safe parsing/serialization for legacy PHP combo config and migration preflight for the two `combo_set_product` indexes; no legacy cleanup or production combo assignment is performed automatically.

### Fixed

- Hid only the voucher card, slider, dialogs, and “Xem tất cả voucher” action when no voucher applies to the current product; the independent product-promotion demo remains visible.
- Routed browser-side combo group, quote, cart, and order requests through the storefront same-origin `/api/*` rewrite so the strict `connect-src 'self'` CSP no longer blocks modal product loading.
- Stripped the localStorage-only combo cart `version` field from quote and order requests, preventing strict API validation failures after navigating to the separate combo cart.
- Allowed an empty combo-order CAPTCHA token to reach the explicit non-production development bypass; production verification remains mandatory in the server verifier.
- Started the email outbox worker alongside the local web-admin dev server, while retaining API-only and worker-only commands and leaving production PM2 ownership unchanged.
- Loaded Next environment files before importing the worker's SMTP module, ensuring both local and PM2 workers receive mail configuration before transporter initialization.

### Verified

- Product-group migration ran twice on local `hanoi23_db`; all four legacy table counts remained unchanged. Real group `2133` returned four valid SKU cards with one current item. Unit tests passed 33/33, integration 2/2, both typechecks/lints/builds passed, and local healthcheck passed 13/13.
- Voucher discovery smoke checks showed `LAPTOP5` on eligible product `90669`, hid the complete section for ineligible product `76158`, applied the expected `50.000đ` cap in cart quote, and passed 28 unit tests, both builds, integration, and 13/13 health checks.
- Combo migration completed twice against identified local `hanoi23_db`; all three combo-order metadata columns and four relation/metadata indexes were verified present.

- Added independent product/category buying-guide tables, bounded admin APIs, a reusable management editor with preview, and an accessible data-driven storefront accordion.
- Added detail-only buying-guide loading and a dedicated catalog-detail cache version so guide updates do not evict list, search, or homepage caches.
- Added a bounded, cycle-safe product/news category-trail resolver with deterministic legacy CSV and junction-table fallbacks.
- Added a shared semantic storefront breadcrumb for product, product-category, article, and news-category screens; mobile trails scroll internally without horizontal document overflow.
- Added unit coverage for malformed CSV values, deterministic leaf selection, missing parents, and cycles.
- Added category-ranked similar products, browser-local recently viewed products with batch revalidation, and title-ranked related posts as three independent product-detail sections.

### Fixed

- Corrected news-category article joins from the nonexistent `news_id` column to `article_id`, restoring category listing and pagination responses.

### Verified

- Buying-guide migration completed twice against identified local `hanoi23_db`; both InnoDB tables, unique/display indexes, and `ON DELETE CASCADE` were verified. The database now has 282 tables: 154 InnoDB and 128 MyISAM.
- Buying-guide validation raised the backend unit suite to 18/18; integration remained 1/1, both app typechecks/lints/builds passed, and local healthcheck passed 13/13.
- Both applications passed TypeScript, ESLint `--quiet`, and production builds; backend unit tests passed 18/18, integration tests passed 1/1, and local healthcheck passed 13/13.
- Product breadcrumb layout reported equal document client/scroll widths at 320, 768, 1024, and 1440 px.
- Product related-content sections reported equal document client/scroll widths at 320, 768, 1024, and 1440 px; expand/collapse exposed 5/15 cards and recently viewed history excluded the current product.

## 2026-07-11

### Added

- Added canonical Zod validation and bounded request parsing for high-risk order, quote, customer, and authentication flows.
- Added atomic MySQL rate limiting, action-specific reCAPTCHA, honeypot handling, request IDs, safe error envelopes, and `Retry-After` responses.
- Added order idempotency, transactional email outbox, cross-worker cache versions, signed webhook nonces, liveness/readiness, and background cleanup/outbox processing.
- Added Caddy and PM2 one-host runtime configuration plus a full 1,500-VU k6 scenario.
- Added validation unit tests and order idempotency/rollback integration coverage.
- Added root AI entrypoints and refreshed the canonical handoff/documentation set.

### Changed

- Redesigned the storefront product-detail hero as a responsive `40/30/30` gallery, product-information, and purchase grid while preserving the existing cart and checkout flows. Missing bundle, voucher, variant, favorite, and financing integrations are isolated client-side demos and never enter commerce API payloads.
- Reworked order creation to validate before acquiring a DB connection and to quote once inside a transaction with voucher locking and bulk item insertion.
- Upgraded storefront to Next.js 16.2.9 and React 19.2.4; both applications now share the supported major runtime.
- Added Argon2id password writes with legacy bcrypt verification/upgrade and corrected customer sliding session expiry.
- Reduced public header payload from about 99 KB to 51 KB and homepage bootstrap from about 148 KB to 97 KB; added ETag/conditional GET and bounded cache keys.
- Hardened search webhook authentication, image upload content checks, production cookie attributes, CORS/origin handling, security headers, and DB pool backpressure.
- Applied the additive admin migration to the configured local DB; read-only verification found 280 tables (152 InnoDB, 128 MyISAM).

### Verified

- Both application typechecks, ESLint `--quiet`, production builds, and npm audits passed; audits reported zero known vulnerabilities.
- Validation tests passed 5/5 and the idempotency/rollback integration test passed 1/1.
- Liveness/readiness/storefront returned HTTP 200 and local healthcheck passed 13/13.
- Full 1,500-VU production-like capacity testing remains pending and is an explicit release blocker.

## 2026-07-09

### Added

- Split managed menu data into all-site header data and homepage-only blocks:
  - Admin pages: `/content/menu/header`, `/content/menu/homepage`.
  - Public APIs: `/api/menu/header`, `/api/menu/homepage`.
- Added banner carousel management backed by legacy `idv_seller_ad_location` and `idv_seller_ad`, with extra metadata in `web_admin_banner_meta`.
- Added homepage banner APIs and cache:
  - `/api/banners/homepage`
  - `/api/banners/global`
  - `/api/banners/location/[locationKey]`
- Added product-card attribute badge rules using existing attribute tables plus `web_admin_product_card_attribute_rules`.
- Added category first-box metadata using `web_admin_category_feature_boxes`, exposed through category/product APIs and rendered on homepage/category layouts.
- Added docs for the new DB helper tables and migration handoff requirements.

### Changed

- Enabled vertical resize for the article category detail editor in `web-admin`.
- Documented the admin UI rule that long-form `RichTextEditor` fields should use the `resizable` prop and vertical-only TinyMCE resizing.
- `Section3` hero carousel is data-driven and includes hover/focus prev-next controls.
- Product listing/search payloads can include `cardBadges` without extra storefront attribute requests.
- Category edit keeps every existing legacy field and adds a separate first-box configuration panel.

### Verified

- `web-admin`: typecheck passed.
- `font-end`: typecheck passed.
- `web-admin`: build passed with `NODE_OPTIONS=--max-old-space-size=4096`.
- `font-end`: build passed with `NODE_OPTIONS=--max-old-space-size=4096`.

## 2026-07-07

### Added

- Added `AI_HANDOFF.md` as the primary entry point for another AI or developer.
- Added live database documentation for the new `product_data_search` infrastructure.
- Added product image album upload implementation in `web-admin`:
  - Three image types: `product`, `self`, `customer`.
  - Admin API routes for list, upload, batch metadata update, and delete.
  - Media serving route backed by `MEDIA_ROOT`.
  - Legacy sync back to `proThum`, `image_collection`, and `image_count`.
- Added storefront product detail image grouping:
  - `imageGroups.product` contains `product + self`.
  - `imageGroups.customer` contains `customer`.
- Added admin migration definition for `web_admin_product_images`.

### Changed

- Refreshed root, architecture, progress, and database docs to reflect the audited 2026-07-07 state.
- Documented that `web_admin_product_images` exists in code but was not present in the live database at audit time.
- Documented that builds require increased Node memory in this workspace.
- Updated database counts from the old 241-table snapshot to the current 244-table snapshot.

### Verified

- Live DB audit:
  - 244 total tables.
  - 116 InnoDB tables.
  - 128 MyISAM tables.
  - `product_data_search` has 28,763 rows.
  - Search table has 0 missing products.
- `web-admin`: typecheck passed.
- `font-end`: typecheck passed.
- `web-admin`: build passed with `NODE_OPTIONS=--max-old-space-size=4096`.
- `font-end`: build passed with `NODE_OPTIONS=--max-old-space-size=4096`.

### Known Gaps

- `web_admin_product_images` still needs to be created on the target DB by running the admin migration with `ADMIN_WRITE_ENABLED=true`.
- Admin write APIs still need authentication/authorization before production use.
- `web-admin` lint still has legacy issues.
- `font-end` lint is not configured; Next.js prompts for setup.

## 2026-07-06

### Added

- Guest cart in storefront with `localStorage` key `hacom.cart.v1`.
- Select item/select all, quantity update, remove, save for later, and restore flows.
- Header cart badge synced with `useSyncExternalStore`.
- `POST /api/cart/quote` to validate products, prices, and sale state from DB.
- `POST /api/orders` to re-quote and insert into `build_buy` and `build_buy_item`.
- Checkout flow that uses selected cart items only.
- React menu data in `font-end/src/components/menuData.ts`.
- First-pass Admin CRUD API/UI for products, product categories, articles, and article categories.
- Admin helper tables `web_admin_sequence` and `web_admin_entity_registry`.
- Admin migration script `npm.cmd run admin:migrate`, gated by `ADMIN_WRITE_ENABLED=true`.

### Changed

- Storefront dynamic slug pages fetch initial data on the server.
- Category product fetching was split from category metadata fetching.
- Category fetch flow now uses request cancellation, parallel data loading, maps, and derived state.
- `/api/categories/attributes` uses a derived aggregate query instead of repeated correlated counts.
- `/api/products` clamps pagination, simplifies count queries, and joins category membership directly.
- `ProgressiveImage` caches placeholders and uses native lazy loading.
- `ProductCarousel` improved drag/timer behavior.
- Admin list pages fetch counts and data in parallel.
- `db.ts` prefers `DATABASE_URL` and falls back to legacy DB env variables.
- TinyMCE loads only when the rich text editor mounts.
- `lucide-react` package import optimization was added to both apps.

### Fixed

- Removed dependency on global `window.toggleMenu`, `window.toggleFilter`, and `window.toggleSidebarSearch`.
- Removed global storefront `public/main.js` usage.
- Fixed cart hydration warning with a singleton empty cart snapshot.
- Sanitized legacy filter values that contain `javascript:void(0)` or URL-like junk.
- Avoided rendering `idv_attribute.icon` URL placeholders as visible text.
- Removed duplicated TinyMCE runtime file from the wrong location.

### Verification

- Storefront build passed.
- Admin build passed.
- Product detail to cart to checkout smoke flow passed, without submitting a real order.
- Category menu/filter/pagination smoke flow passed.
- Admin product list and TinyMCE `/news/edit` smoke flow passed.
- Attribute API category `159` was observed around `53-61ms` warm.
- Products API category `159` was observed around `44-45ms` warm.

### Known Gaps

- Checkout quantity handling still needs stricter backend rejection rather than clamping.
- Order endpoint still needs rate limiting, CORS allowlist, stronger validation, idempotency, and safer error responses.
- No automated integration test yet for order transaction commit/rollback.
- Cart can briefly display cached local prices while quote is loading.

## 2026-07-12 — Combo cart/checkout visual parity

### Changed

- Rebuilt `/gio-hang-combo` and `/thanh-toan-combo` with the storefront dark commerce frame, Header, Footer, responsive cart/checkout grid, shared checkout product presentation, and mobile-safe bottom spacing.
- Added a display-only “Ưu đãi combo” card in the cart sidebar; combo checkout retains its independent quote, CAPTCHA, idempotency, order API, and local-storage lifecycle without accepting vouchers.

### Verification

- Storefront TypeScript, ESLint, and production build passed.
