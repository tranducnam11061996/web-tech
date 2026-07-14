# Changelog

Notable workspace changes are grouped by implementation/audit date.

Historical entries describe the state on their own date. Use `AI_HANDOFF.md` and `PROJECT_PROGRESS.md`, not an older “Known Gaps” section, for current status.

## 2026-07-14

### Storefront form validation and error clarity

- Added shared Vietnamese phone, email, password, OTP, birthday, address, tax-code, quantity, voucher, search, and price-range validation plus a structured storefront API error model retaining status, code, fields, retry delay, and request ID.
- Added field-level blur/change validation, focus/ARIA error handling, and clear CAPTCHA/network/server failures to registration, login, recovery, profile/address/password, cart, and checkout flows. Standard and combo orders now send canonical location codes.
- Replaced open receiver/invoice records with conditional backend schemas, preserved order idempotency/transaction protections, and moved empty CAPTCHA-token enforcement to the authoritative verifier so only the explicit non-production bypass can accept it.
- Bounded cart/search/filter controls, added validated brand/collection price ranges, and marked newsletter/comments honestly unavailable because no persistence/moderation API exists.
- Added backend validation coverage and storefront Playwright coverage for normalization, conditional checkout groups, field mapping, and registration phone errors.
- Verification passed both application typecheck/lint/build pipelines, 94/94 backend unit tests, the default integration suite (3 pass/6 environment-gated skips), and 14/14 focused desktop/mobile validation/accessibility checks. The full storefront run is 56 pass/2 expected skips/2 unrelated product-description fallback width failures; no production healthcheck was claimed against the active development servers.

### Customer product favorites

- Added additive InnoDB `web_admin_customer_favorites` with unique customer/product membership, stable cursor ID, customer cascade, list/product indexes, readiness gating, and same-transaction cleanup during permanent admin product deletion. The live migration followed a restore-verified backup and two-pass disposable-clone trial; live state is 289 tables (161 InnoDB/128 MyISAM), zero favorite rows, and `ADMIN_WRITE_ENABLED=false`.
- Added authenticated, no-store customer APIs for a 24-item cursor list, a deduplicated 100-ID status batch, and idempotent PUT/DELETE mutations with origin validation, per-customer rate limiting, fixed route metrics, request IDs, and safe errors. List/product validation uses the current public catalog rather than storing stale snapshots.
- Added a customer-scoped external favorite store beside the session provider, mounted-card batching with no guest favorite requests, optimistic synchronized hearts, accessible busy/pressed/live states, login-save continuation, header links, and the standalone noindex `/yeu-thich` search-style grid with skeleton, empty/error/retry, load-more, and direct removal.
- Added backend migration/parser coverage and desktop/mobile Playwright coverage for guest redirects and zero requests, single deduplicated status batching, list load-more, and immediate removal.

### Product-description fallback for missing articles

- Product details with no article HTML now retain the existing description disclosure/content markup, render only the product name in its heading, and show the existing thumbnail above every normalized `proSummary` line without list markers or sidebar check icons. Both branches retain the collapsed-height reference used by the technical-specification column; article markup remains unchanged.
- Centralized non-empty `proSummary` line normalization for the product-detail fallback and quick-specification sidebar, avoiding separate parsing behavior.
- Added desktop/mobile Playwright and scoped Axe coverage for the article and no-article branches. The full storefront suite passes 40 tests with 2 expected project-specific skips; both application validation pipelines and the temporary-production healthcheck passed 15/15.
- Removed the fallback image wrapper so the thumbnail is the direct full-width image element, and restored desktop sticky behavior for the technical-specification panel: its visible preview remains tied to the collapsed description height while the outer boundary follows the current description height and releases at its bottom.

### Responsive product technical-specification height

- Replaced the unconditional `66vh` desktop technical-specification crop with a measured `pending`/`clipped`/`full` contract. A naturally taller table now clips to the exact collapsed description-column height; a fitting table renders completely without the gradient or modal action.
- Kept specification HTML sanitized and server-rendered, adding only a small client controller that survives streamed DOM replacement, batches resize/intersection/mutation measurements and preserves the collapsed reference while the description is expanded. Mobile retains the existing `66vh` modal preview.
- Added bounded animation-frame retries for transient zero-size startup measurements, preventing a clean Next dev load from remaining `pending`; removed the nested product-bundle modal chunk waterfall so direct Chromium acceptance no longer reports its stale hash 404.
- Added desktop/mobile Playwright coverage for both desktop branches, live resize, description expansion, modal keyboard/focus behavior, scoped Axe checks and the unchanged mobile behavior. The stable full run passes 36 tests with 2 expected project-specific skips; both application pipelines and temporary-production healthcheck pass 15/15.

### Product-description preview disclosure

- Replaced the closed native `<details>` pattern that hid the complete product article with a bounded visible preview and native accessible “Xem thêm” / “Thu gọn” button.
- Added desktop/mobile Playwright coverage that confirms visible initial content, expansion, collapse, focus retention, and the correct ARIA state on a long PC description. The full suite passes 34/34; both app pipelines and transitional local health 15/15 also pass.

### Empty similar-product sections

- Product detail now omits the entire “Sản phẩm tương tự” region when the supplemental API returns no recommendations, instead of rendering an empty-state card.
- Added desktop/mobile Playwright coverage for the empty-recommendation product detail route, including absence of the section, heading, and grid. These checks remain green within the expanded 34/34 suite; both app pipelines and transitional local health 15/15 also pass.

### Product-detail quick-specification disclosure

- Fixed the product-detail `proSummary` preview so one to five non-empty rows render in full without a control, while longer summaries render exactly five rows before an expand/collapse action.
- Replaced the closed `<details>` structure that hid every row with a native button using `aria-expanded` and `aria-controls`; overflow rows remain in the DOM with the semantic `hidden` state and the control retains keyboard focus while toggling.
- Added desktop/mobile Playwright coverage for the 3-row, 5-row and 8-row boundaries, exact Vietnamese labels, Enter/Space interaction, focus retention and scoped Axe checks. These checks remain green within the expanded 34/34 suite; both app pipelines and transitional local health 15/15 also pass.

### Canonical square product-card media

- Added one final component-level `product-card-image-frame` contract: every real product-card media area is a non-shrinking `1:1` square and every child image uses centered `object-fit: contain`, so portrait, landscape and square assets remain fully visible without JavaScript orientation checks.
- Applied the contract to shared client/SSR product cards and dynamic homepage cards, and aligned the collection loading skeleton while leaving product galleries, cart/checkout thumbnails, news, banners and placeholder demo sections unchanged.
- Added desktop/mobile Playwright coverage for portrait/landscape/square fixtures, fallback SVG, homepage/category/brand, similar/recently-viewed cards and 320/768/1024/1440 widths. These checks remain green within the expanded 34/34 suite; both app pipelines and local health also pass.

### Progressive image hydration repair

- Fixed a shared `ProgressiveImage` hydration race where cached images could complete before React attached handlers and then remain stuck in the loading blur after an effect reset. Image state is now bound to the active source and reconciles the DOM `complete`/`naturalWidth` result after hydration.
- Cached failures now switch once to the SVG placeholder even when the browser error event occurred before hydration; stale load/error events cannot update a newer source, and caller callbacks remain composed with the internal handlers.
- Reduced the one-shot loading effect from `blur-md`/500ms/`transition-all` to bounded `blur-sm`/300ms with explicit opacity, transform and filter transitions.
- Verified 16/16 desktop/mobile Playwright checks, 4/4 focused tests against the production build, category/product/news image smoke with zero loaded images stuck in loading classes, both application pipelines, and 15/15 local health.

### Storefront category and search pagination

- Fixed category/search client pagination constructing relative paths with `new URL()` without a base, which threw before `fetch` and activated the route-level error boundary. Browser requests now use same-origin `/api/products` and `/api/search` paths through the storefront rewrite.
- Made `?page=N` the single pagination state for category and search pages, including SSR deep links, Back/Forward, page-one canonicalization, bounded out-of-range correction, filter/sort reset, aborted stale requests, accessible page controls, and inline retryable API errors.
- Added desktop/mobile Playwright coverage for page-two navigation, reload, history, filter reset, local failure/retry, search pagination, and invalid/out-of-range pages.

### Product-category route repair and descendant scope

- Repaired all 788 `idv_url` product-category rows from legacy `url_type='0'` to `product:category` after a restore-verified backup and disposable-clone `apply -> rollback -> re-apply` trial. The guarded command binds the exact database, preimage hash, verified manifest, maintenance flag, advisory locks and confirmation; rollback uses an external SHA-256 preimage and creates no recovery table.
- Made catalog resolution use exact category/product `id_path` prefixes, temporarily accept exact legacy type-0 catalog paths, and reject article/news or mismatched route types. Importer and admin product/category saves now always write canonical types; category applied verification checks all 788 types, hashes and orphans.
- Added one bounded enabled-descendant category scope shared by product list/count, price bounds, brand/attribute filters and counts. Immediate-child API counts now aggregate each enabled subtree and product results remain distinct across multiple junction links.
- Added `idx_webtech_category_parent_status(parentId,status,id)`. Clone `EXPLAIN ANALYZE` reduced the 29-node category-521 hierarchy query from about 1.05 ms with repeated 788-row scans to about 0.071 ms with covering index lookups; product membership retained the existing category/product index.
- Live `/pc-van-phong.html` now resolves category 521 and visibly renders 34 products; child 578 renders 7, disabled category 71 stays 404, and product/news routes remain unchanged. Both app pipelines, 88 unit tests, integration/destructive fixtures, restore verification and 15/15 local health passed.
- Recorded pre/post restore-verified backup SHA-256 values `e47e523256f7eaa94156ee81007ecc8b75d9bea0fba41779d88431cae52dab21` and `4d7c52495957b1072627c5c9bbf7326b08fee6e595b43ace37f93f3f991472ef`. A separate read-only check found two new PCMarket articles (IDs 682/683); they were not imported as part of this catalog repair.

## 2026-07-13

### PCMarket finalization, PCM brand, news indexes, and recovery cleanup

- Reserved public brand ID 96/slug `pcm`, mapped the PCMarket unassigned sentinel `0 -> 96`, retained aliases `34 -> 25` and `57 -> 31`, and blocked conflicting future source ID 96 records. Live run 8 applied the unchanged brand hash and produced 90 brand/info rows, 1,587 brand-category rows, PCM 2,276 total/849 enabled products, and zero noncanonical references.
- Added read-only importer `--verify-applied`, acceptance/rollback-closure/recovery-cleanup audit fields, rollback refusal after closure, restore-verification manifests, and guarded exact-name `db:import-recovery-cleanup` with all importer locks and destructive confirmations.
- Replaced news category `OR` membership/dependent subqueries with `UNION DISTINCT`; added status/date, URL/status, and two covering junction indexes. Before/after plans moved news list/detail off full scans and made category junction membership use the composite index.
- Restore-verified a 352-table pre-finalization backup, proved clone run-8 apply/rollback/re-apply, index apply, 88-table clone cleanup, 288-table healthcheck, and closed rollback. Restore-verified the 362-table post-run-8 backup before live cleanup, then removed exactly 74 live recovery tables.
- Final live database is 288 tables (160 InnoDB/128 MyISAM), 84,040 rows, zero recovery/stage/restore and Latin-1 objects. Final lean backup SHA-256 is `941f3b5abcfd30db21f913d9741c68d32c69aa068a4a646b7c1ea60f4c37456a` and its disposable restore passed.
- Verification passed 84/84 unit tests, default integration (3 pass/6 gated skips), both app typecheck/lint/build pipelines, 15/15 live health, PCM public API/page, and news API/plan checks. No 1,500-VU capacity claim was made.

### PCMarket article import and live news

- Added the guarded `articles` importer with two-pass canonical snapshots, ID 83 quarantine, duplicate category removal, HTTPS media preservation, HTML sanitization, MyISAM staging/swap, transactional InnoDB writes and compensated rollback.
- Restore-tested the post-run-6 backup, completed clone apply/rollback/re-apply, then applied live run `7` with 668 articles, 668 content rows, 705 category links and 669 audit records while preserving catalog/search/index/routine/trigger invariants.
- Added bounded public news index/detail/category APIs with ETag, active-only filtering, deduplicated category counts, absolute thumbnails and related-news fallback.
- Replaced storefront news demo content with live paginated pages, true not-found behavior, local canonical/Open Graph metadata and a second HTML sanitizer; updated admin/recommendation image resolution for absolute PCMarket URLs.

### PCMarket article-category import

- Added `article-categories` to the guarded PCMarket importer with strict source schemas, bounded HTTPS-only pagination, double-snapshot SHA-256 stability, source ID/tree/route/media normalization, and ignored raw audit snapshots.
- Added empty-target/schema/route/FK/trigger/catalog preflight, exact database/hash/backup/maintenance/confirmation gates, advisory locking, transactional category/route/registry/record/map writes, four retained run-scoped backups, and run-ID rollback.
- Created and checksum-verified a fresh pre-import SQL/ZIP backup, restored it into `it_tech_db_article_category_test_20260713_203630`, and passed clone apply/verify/rollback before live cutover.
- Applied live run `6` with snapshot `0a3d22d053ec9feb5f6eadf752b4191a240b5e0010515f671a84fd0a34204b04`: 4 enabled root categories and 4 canonical routes/registry/map/record rows, with no articles or menus created and no media downloaded.
- Verified 346 tables, 152,162 exact rows, unchanged critical catalog counts `788/89/4,712/4,712`, 25 full-text indexes, 1 routine, 2 triggers, UTF-8 API/storefront rendering for all four routes, both application pipelines, 74 unit tests, default integration, readiness/liveness, worker startup, and 15/15 local health.

### Runtime database collation normalization

- Added guarded `db:collation` audit/apply/verify tooling with exact database allowlisting, SHA-256 plan locking, advisory locking, backup/maintenance/confirmation gates, schema/index/row preconditions, target-collation duplicate and index-size preflight, per-table manifests, and idempotent resume from a locked baseline.
- Generated and checksummed a fresh offline rollback dump (`105,255,739` bytes; SHA-256 `cc0b1d36f07ee8262e8209e0c769cacc3bf9e62624fa24eb2d1cdcf7d7884839`) and ZIP (`13,806,911` bytes; SHA-256 `8e0b929be2517a05219bcf0eb167fb3175e98772b96d5a1baef50e150cdad489`).
- Restored the dump into disposable clone `it_tech_db_collation_test_20260713_195854`, converted 240 runtime tables, repaired 54 banner-location names from verified UTF-8 bytes, and proved a second apply skips all 240 completed tables.
- Applied live plan `15f0f236257b0214617d6b3f0ec8b04d02aad19989d91f04f8044665fc5782e6` in 12.8 seconds. Verification retained 342 tables, 152,141 rows, 1 routine, 2 triggers, 25 full-text indexes, and all critical catalog counts; residual Latin-1 is confined to 31 recovery tables/108 columns and runtime `utf8mb3` is zero.
- Cut local root/web-admin configuration over from `hanoi23_db` to `it_tech_db` with `ADMIN_WRITE_ENABLED=false`, restarted both applications and the worker, passed readiness/liveness, 69 unit tests, default integration, both typecheck/lint/build pipelines, 15/15 transitional health, and 14/15 strict health (only the unpopulated collection API returns 404).

### Documentation and database portability audit

- Re-audited every project-owned Markdown file against Git, package scripts, API/page inventory, importer code, tests, and live `it_tech_db`; reconciled the canonical handoff, architecture, progress, app READMEs, checklists, search reference, and database references.
- Corrected current-state documentation from historical `hanoi23_db` counts to the active 788-category/89-brand/4,712-product catalog and separated the stable 285-table pre-import baseline from the 342 physical tables that include retained importer recovery objects.
- Added `web-admin/database-docs/DATABASE_TRANSFER.md` with the verified MySQL CLI export/import, SHA-256, disposable restore checks, target compatibility caveats, and phpMyAdmin `max_input_vars` diagnosis.
- Generated `it_tech_db-migration-20260713-175300.sql` (105,243,385 bytes, SHA-256 `86b1eb9113e3c0424abd8a480936aab9123784333b1fdb1740920c5c0662e9a8`) plus a 13,806,638-byte ZIP outside Git. Disposable restore matched 342 tables, 152,141 exact rows, 1 routine, 2 triggers, and critical catalog counts before cleanup.
- Documentation-review verification reran 66/66 unit tests, the default integration suite (3 pass, 4 intentionally environment-gated skips), strict runtime health (13/15; only the two intentionally absent collection routes returned 404), and transitional health with `LOCAL_HEALTHCHECK_EMPTY_CATALOG=true` (15/15).

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
