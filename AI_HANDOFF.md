# AI Handoff — HACOM Workspace

Last verified: `2026-07-14`

This is the canonical current-state handoff. Read `AGENTS.md` first, then this file, `ARCHITECTURE.md`, `PROJECT_PROGRESS.md`, and the README for the application being changed. Database work also requires `web-admin/database-docs/DATABASE_SCHEMA.md`; backup or machine-transfer work requires `web-admin/database-docs/DATABASE_TRANSFER.md`.

## Current repository state

- Repository: `tranducnam11061996/web-tech`.
- Branch: `main`.
- Current committed HEAD before this documentation pass: `6814c34` (`feat: import PCMarket catalog into it_tech_db`), synchronized with `origin/main`.
- The working tree contains the uncommitted article/news and PCMarket-finalization implementation described here. Do not discard, reset, or overwrite these or unrelated changes; always inspect `git status` and the relevant diff.
- `web-admin` owns the admin UI, every API, MySQL access, migrations, importers, and the background worker.
- `font-end` owns the customer storefront and may consume only `web-admin` APIs.
- `search-tool` is a historical prototype. Production search is implemented in `web-admin`.

## Active runtime and data

The active local database is `it_tech_db`. The prior `hanoi23_db` remains available as the untouched legacy source and must not be changed by current work.

### Accepted PCMarket final state

- Live brand run `8` applied source hash `4ace3a4c0cc7ba7c2270e10463ce7f31e653d7c86915cdc2b13db6eeacf43eef`. The managed public brand `PCM` is ID `96`, slug `pcm`, status `1`, ordering `8388607`; source mappings are `0 -> 96`, `34 -> 25`, and `57 -> 31`.
- Runtime counts are 90 brands/info rows, 1,587 brand-category rows, 4,712 product/price/info/search rows, and zero product references to brand IDs 0/34/57. PCM owns 2,276 products, 849 of them enabled, and `/brand/pcm` returns the public 849-product catalog.
- The catalog/news inventory remains 788 categories, 14,455 product-category links, 17,603 product-attribute links, 4 news categories, 668 articles/content rows, and 705 unique news-category links. Article 83 remains the only pending quarantine record.
- Runs 2-8 were accepted after a restore-verified post-run-8 backup. All 74 run recovery tables were removed by the guarded cleanup; audit records/maps/snapshots remain. Rollback is closed for runs 2-8.
- The lean database contains exactly 288 tables: 160 InnoDB and 128 MyISAM, with zero import recovery/stage/restore tables and zero Latin-1 tables/columns.
- Four news indexes are live. News list/detail/category membership plans use them without full-table filesort or dependent subqueries.
- All 788 product-category routes now use `url_type='product:category'`; request-path hashes are valid and there are no category route orphans/duplicates. The catalog resolver still accepts an exact legacy product/category `id_path` with `url_type='0'` during rollout, but never treats article/news paths as catalog entities.
- Public `category_id` reads include the enabled root and every enabled descendant through a bounded recursive scope. Category 521 (`pc-van-phong.html`) resolves to 29 enabled category IDs and 34 distinct enabled products; the storefront route is visibly rendering those products on port 3001. `idv_seller_category.idx_webtech_category_parent_status(parentId,status,id)` is live.
- A read-only source check on `2026-07-14` found new article exporter hash `aaeda512473de728ba04eff924ea07f1c31587a5cf0194ea1a69220428760784`: source IDs 682 and 683 were added, with no changed/removed prior records. They were not imported during the catalog-route repair; live run 7 remains 668 articles plus quarantined ID 83.

### Collation migration state

- Final accepted cleanup supersedes the earlier phase-2 warning: no `web_admin_import_b_*` table remains and live `information_schema` reports zero Latin-1 tables/columns.
- Phase 1 completed offline on MySQL 8.4.3 on `2026-07-13` with plan hash `15f0f236257b0214617d6b3f0ec8b04d02aad19989d91f04f8044665fc5782e6` after a successful disposable-clone trial.
- All 240 affected runtime tables were normalized to `utf8mb4_unicode_ci`: 187 required character-column conversion and 53 required only a new table default. The 14 runtime `utf8mb3` columns were also converted.
- Exactly 54 of 78 `idv_seller_ad_location.name` values were losslessly repaired from UTF-8 bytes previously interpreted as Latin-1. No other content rewrite was performed.
- Verification preserved 342 tables, 152,141 exact rows, 1 routine, 2 triggers, 25 full-text indexes, 788 categories, 89 brands, and 4,712 product/price/info/search rows.
- Accepted cleanup removed all run 2–8 recovery objects. Live verification reports zero Latin-1 tables and character columns.
- The ignored root and `web-admin` environments now point to `it_tech_db` and persist `ADMIN_WRITE_ENABLED=false`. Local web-admin, storefront, and background worker were restarted and verified against that database.

### PCMarket import runs

| Run | Entity | Status | Snapshot/result |
|---:|---|---|---|
| 1 | safe configuration from `hanoi23_db` | applied | 5,170 rows |
| 2 | product categories | applied | 788 source categories |
| 3 | products, original brands, attributes and values | applied | 4,712 products |
| 4 | brands | rolled back | retained recovery/audit data |
| 5 | corrected canonical brand sync | applied | 91 source records → 89 runtime brands |
| 6 | article categories | applied | 4 root categories, routes, registry/map/record rows |
| 7 | articles | applied | 669 source records → 668 runtime articles; source ID 83 quarantined |

| 8 | PCM fallback brand finalization | applied, accepted, rollback closed | 91 source brands plus sentinel map to 90 runtime brands; `0 -> 96` |

Current catalog assertions:

- Categories: 788 unique IDs, 60 roots, maximum depth 3, 722 enabled and 66 disabled.
- Products: 4,712 store/price/info rows, 2,528 enabled and 2,184 disabled; 415 have price 0.
- Relations: 14,455 product-category, 17,603 product-attribute, and 162 category-attribute rows.
- Brands: 90 runtime brands and 90 `sellerId=0` info rows. Source IDs `0 → 96` (PCM), `34 → 25` (E-DRA), and `57 → 31` (TEAMGROUP) are durable mappings.
- Search: 4,712 `product_data_search` rows and no missing product row at the latest catalog verification.
- Media: imported category/product/brand images remain absolute `https://pcmarket.vn/...` URLs. No PCMarket binaries were downloaded into the workspace or `MEDIA_ROOT`.
- News: 4 enabled root categories and 668 PCMarket articles are live. The runtime inventory is 654 enabled/14 disabled articles, 668 content rows, 705 unique category links, 653 absolute PCMarket thumbnails, 14 uncategorized articles, and 50 multi-category articles. Source ID `83` remains a pending audit record because it has no title/slug and resolves to `/.html`; no menu was synthesized.
- Incomplete product variant/config/comboset references remain audit-only and pending; they are not runtime catalog configuration.
- Current `it_tech_db` has no collection, combo-set, product-group, voucher, product-promotion, buying-guide, modern product-image metadata, or customer-favorite rows. Their code/schema may be implemented, but storefront sections correctly remain empty/404 until approved data is created, imported, or a customer saves a favorite.

The database currently exposes 289 physical tables: 161 InnoDB and 128 MyISAM. Import audit/map/snapshot history is retained, but accepted run-scoped recovery tables have been removed after two independent restore-verified backups and a destructive clone trial.

## Implemented application surface

### Catalog and public storefront

- Product-detail descriptions keep a visible, height-bounded preview and use an accessible native expand/collapse control; the sanitized article body remains server-rendered within the small client disclosure wrapper.
- Product details without an article retain the existing description disclosure/content DOM, show the product name without the `Đánh giá:` prefix, and render the thumbnail plus an unmarked normalized `proSummary` list inside that content region. Article products retain their rendered markup unchanged, and both branches preserve the collapse-height reference for technical specifications.
- Desktop product-detail technical specifications measure their natural table height against the description column's collapsed height. Overflowing tables clip to that exact height and retain the modal action; fitting tables render in full without the gradient/action. The visible preview keeps that collapsed reference while the outer sticky boundary follows the description column's current height, anchors at `110px`, and releases at the description bottom. Initial zero-size measurements retry for a bounded number of animation frames so a clean dev load cannot remain `pending`. Mobile keeps the existing `66vh` modal preview.
- Product-detail similar-products content is omitted entirely when the supplemental recommendation list is empty; recently viewed and related-post sections remain independent.
- Product-detail quick specifications render every non-empty `proSummary` line when there are at most five. Longer summaries render five rows initially and expose an accessible expand/collapse button that keeps all rows in the DOM and resets to collapsed for a different product.
- Shared `ProgressiveImage` state is source-bound and reconciles `complete/naturalWidth` after hydration, so cached image success/failure cannot remain blurred when browser load/error events precede React; failure falls back once to the SVG placeholder and stale events cannot affect a newer source.
- Real product cards now share one non-shrinking `1:1` media frame with centered `object-fit: contain` images. The contract covers dynamic homepage cards, category/search/collection/brand grids, similar products and recently viewed cards without changing galleries, cart/checkout media, news or banners.
- Category and search pagination now treat the query string as the only page state: page one is canonical without `page`, later pages use `?page=N`, SSR/direct loads and history navigation remain aligned, and failed browser API refreshes render an inline retry instead of `[slug]/error.tsx`.
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
- Signed-in customers can save live catalog products in `web_admin_customer_favorites` and review them at `/yeu-thich`. Card status is fetched only after session confirmation through one deduplicated batch (maximum 100 IDs); the list is cursor-paginated at 24 cards without a count query. Guest heart clicks go through login, save idempotently, then continue to the list.

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

Finalization artifacts under `D:\web-tech\tmp\db-backups`:

- Pre-finalization restore-verified bundle: `it_tech_db-pre-pcm-finalization-2026-07-13T15-50-38-991Z.json`, SHA-256 `639935bccebf4d323b215aa6099add3696421ed5b4253605881d195b274b5ec6` (352 tables / 156,881 rows). Its retained clone proved run-8 apply, exact rollback, re-apply, index migration, cleanup, and healthcheck.
- Post-run-8/pre-cleanup restore-verified bundle: `it_tech_db-post-run8-pre-cleanup-2026-07-13T16-01-00-579Z.json`, SHA-256 `13339649231447567a6e499212076f8ff66c0f4ea0a2954e5b9e26fa3a401e27` (362 tables / 194,067 rows). This manifest authorized the live recovery cleanup.
- Final lean restore-verified bundle: `it_tech_db-final-lean-post-cleanup-2026-07-13T16-02-29-692Z.json`, SHA-256 `941f3b5abcfd30db21f913d9741c68d32c69aa068a4a646b7c1ea60f4c37456a` (288 tables / 84,040 rows / 1 routine / 2 triggers).
- Pre-category-route-repair bundle: `it_tech_db-pre-catalog-route-repair-2026-07-13T17-26-35-738Z.json`, SHA-256 `e47e523256f7eaa94156ee81007ecc8b75d9bea0fba41779d88431cae52dab21` (288 tables / 84,049 rows / 1 routine / 2 triggers). Its retained clone passed repair apply, exact-hash rollback, re-apply, measured index migration, runtime API checks, and was then removed.
- Post-category-route-repair bundle: `it_tech_db-post-catalog-route-repair-2026-07-13T17-35-18-760Z.json`, SHA-256 `4d7c52495957b1072627c5c9bbf7326b08fee6e595b43ace37f93f3f991472ef` (288 tables / 84,049 rows / 1 routine / 2 triggers), restore-verified after the live cutover.
- Pre-customer-favorites bundle: `it_tech_db-pre-customer-favorites-2026-07-14T09-41-52-044Z.json`, SHA-256 `c04b1515f44b0a0e4c7b4161ac08059fdda37fa84b1ea8a86cc677f63da2d852` (288 tables / 84,049 rows / 1 routine / 2 triggers). Its retained clone passed two idempotent migrations, exact DDL-hash comparison, index/FK inspection, EXPLAIN, dedupe/isolation/cursor/cascade checks, then was removed before the live additive migration.

A fresh pre-article-category SQL/ZIP archive was generated on `2026-07-13`, checksum-verified, and restored into disposable clone `it_tech_db_article_category_test_20260713_203630`. The verified artifacts are outside Git under `D:\web-tech\tmp\db-backups`; their SHA-256 values and exact procedure are recorded in `web-admin/database-docs/DATABASE_TRANSFER.md`. The clone passed article-category apply, independent verification, and rollback before live run 6. Keep all SQL/ZIP/import snapshots outside source control and verify hashes before moving them.

Earlier run-specific logical backups remain in the same ignored directory. Recorded manifests are: pre-bootstrap `e0def997f5c14c5e5d84a93c17f6ab103e97e6bd3182788c0bcc2b7f8caacefb`, post-bootstrap `105f7c6f311ef605f21f2139573c78313b2a9acdc8fd6c3f121e15e88c73b3cd`, pre-product `f632a4ea910ba8f20094f492ce6535192c77db185e8d6deb0587d87185486968`, and pre-brand `312b0ac3eef985d621120ccd71b8d1cd12c569038f31b70d301c26a4a174d09d`. Preserve them until the corresponding import runs are accepted and their rollback windows are explicitly closed.

Before article run 7, the post-run-6 database was captured and restore-verified as `it_tech_db-pre-pcmarket-articles-trial2-2026-07-13T14-35-27-969Z.json` with SHA-256 `5c2dd8c9e8fcc3b5cef7e157d69e8e60c8142f481294fcde25bee35e55486847`. Disposable clone `it_tech_db_backup_test_1783953327970_b83c6b` passed apply, rollback to the exact empty-article baseline, and a second apply before live cutover.

The local phpMyAdmin export failure was caused by PHP's 1,000-input-variable limit on a 342-table export form. The host-local Laragon PHP setting was raised to 10,000 and Apache was restarted. CLI export remains the recommended transfer method because it is reproducible and avoids browser/PHP form limits.

## Verification evidence

Finalization verification passed 84/84 unit tests, the default integration suite (3 pass, 6 environment-gated skips), both application TypeScript/ESLint/production builds, destructive clone apply/rollback/re-apply/cleanup, final restore verification, and 15/15 live healthchecks with PCM. News list/detail/category APIs and plans were also checked after restart. This is local functional evidence, not a 1,500-VU capacity claim.

Latest full catalog/article-category evidence:

- `web-admin`: TypeScript, ESLint, 88/88 unit tests, default integration suite (3 passed, 6 intentionally environment-gated skips), destructive product-category import fixture, production build.
- Importers: category, product, and brand destructive apply/rollback fixtures passed in disposable databases.
- Article importer: disposable-clone apply/rollback/re-apply passed; live run 7 preserved exact catalog/search/index/routine/trigger invariants and normalized the four run-6 category route hashes.
- `font-end`: TypeScript, ESLint, production build.
- Runtime: 15/15 with `LOCAL_HEALTHCHECK_EMPTY_CATALOG=true`, including product detail/cart quote and public brand API/page; the flag currently permits the intentionally absent API/storefront collection routes to return 404.
- Runtime: `/api/news`, all four category routes, article detail, `/tin-tuc`, category and detail pages return real data; disabled articles and quarantined `/.html` return 404. Readiness/liveness and transitional health pass 15/15.
- Live database after run 8 and accepted cleanup: 288 tables, 84,040 exact rows, 1 routine, 2 triggers, and critical counts 788/90/4,712/4,712.
- Category-route cutover: 788/788 canonical routes, zero invalid hashes/orphans, 29-node/34-product category 521 scope, product/news/inactive-category regression checks, visible Playwright storefront validation, and 15/15 healthcheck with the documented empty-collection allowance. Runtime remains web-admin `:3000`, storefront `:3001`, and one background-worker chain; persisted `ADMIN_WRITE_ENABLED=false`.
- Storefront regression: pagination, SSR page-two loads, history, filter reset, inline retry, URL canonicalization, cached progressive-image hydration, one-shot image fallback, square product-card media, product-description/quick-specification disclosures, responsive technical-specification height and empty similar-product omission pass 40 tests with 2 expected project-specific skips across desktop/mobile Playwright. Portrait/landscape/square fixtures, 320/768/1024/1440 widths, homepage/category/brand, similar/recently-viewed, empty similar-products, visible long-description preview, article-missing thumbnail/unstyled-summary fallback, 3/5/8-row product-summary boundaries and clipped/full/mobile technical-specification states are covered. Both production builds and a temporary-production 15/15 healthcheck passed.
- Customer favorites: the required TypeScript/ESLint/build matrix, 92/92 backend unit tests, default integration suite (3 pass/6 fixture-gated skips), and full storefront Playwright suite (48 pass/2 expected project-specific skips) pass. The 8 desktop/mobile favorite journeys cover guest zero-request behavior, login continuation URL, one deduplicated status batch, cursor load-more, immediate removal, and pre-list guest redirect. Live guest probes return `401`, hostile-origin writes return `403`, readiness remains `200`, and temporary-production healthcheck passes 15/15; the live table is empty after migration and `ADMIN_WRITE_ENABLED=false`.

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

Storefront validation is now centralized for Vietnamese phone/email/password/OTP/address/tax/quantity/voucher/search/price rules. Registration, login, password recovery/change, profile/address, cart, standard checkout, combo submit, brand/collection price filters, and nonfunctional newsletter/comment controls use clearer client validation or honest unavailable states. Public API errors retain field maps and request IDs; order schemas validate conditional receiver/invoice/delivery fields and let the CAPTCHA verifier own empty-token enforcement. No database migration was required.

Validation verification on `2026-07-14`: both application TypeScript/ESLint/production builds pass, web-admin unit tests pass 94/94, default integration passes 3 with 6 environment-gated skips, and the focused desktop/mobile validation/accessibility Playwright run passes 14/14. The full 60-test storefront run has 56 passes, 2 expected skips, and 2 pre-existing product-description fallback width failures (desktop/mobile); do not describe the complete Playwright suite as green until that independent layout regression is resolved. `local:healthcheck` was not rerun because the active processes were development servers.

1. Import the missing variant/config-group/comboset definitions only after complete, validated source exports exist; reconcile their pending audit records explicitly.
3. Complete remaining admin UI/API parity, especially any modal or legacy screen still using placeholder/local-only behavior.
4. Run Playwright accessibility and performance-budget gates against the final runtime and fix any regressions.
5. Execute read, commerce, and abuse k6 scenarios on a production-like 8 vCPU/16 GB staging host; preserve metrics and database evidence.

## Release blockers

- No production-capacity claim is valid until the full staging k6 gate passes.
- Production secrets, CAPTCHA mode, SMTP delivery, proxy/origin configuration, backup/restore, monitoring, TLS, cookie behavior, and MySQL capacity must be verified in the target environment.
- Pending PCMarket variant/config/comboset audit data is not a complete runtime implementation.
- A successful local SQL restore does not replace version-compatibility testing on the destination database server.
