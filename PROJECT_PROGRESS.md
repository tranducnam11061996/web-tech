# Project Progress

Last updated: `2026-07-13`

`AI_HANDOFF.md` is the canonical continuation guide. This file records completion evidence, open verification, and the prioritized backlog.

## Current status

| Area | Status | Evidence / qualification |
|---|---|---|
| Real combo sets / combo cart / combo orders | Code/schema implemented; active catalog unpopulated | Combo API/UI/quote/order behavior exists, but `it_tech_db` has 0 combo sets/relations; 1,121 imported comboset occurrences remain pending audit because source runtime configuration is incomplete |
| Storefront catalog/search/collections | Implemented and locally verified | Bounded APIs, ETag, reduced payloads, cache/single-flight, responsive image behavior |
| Performance/UX optimization | Implemented; strict product bundle target pending | Core/supplemental streaming, byte-bounded SWR cache, ETag/timing/metrics, same-origin browser APIs, quote debounce, image/motion improvements, desktop/mobile axe checks |
| Dynamic breadcrumbs | Implemented and locally verified | Shared semantic component; bounded product/news hierarchy resolver; no extra storefront request or document overflow |
| Product related content | Implemented | Similar products with direct-parent fallback, title-ranked/fallback news, and versioned browser-local recently viewed history |
| Product/category buying guides | Code/schema implemented; active catalog unpopulated | Independent admin-managed content, detail-only API payload, accessible storefront accordion, and selective cache invalidation exist; `it_tech_db` currently has 0 guides |
| Product groups / independent SKU variants | Code/schema implemented; active catalog unpopulated | Admin CRUD, one-group-per-product index, detail-only payload, thumbnail resolution, carousel, and orphan-safe reads exist; current config-group tables have 0 rows and imported variant/config references remain audit-only |
| Guest cart and checkout | Hardened and locally verified | Strict quote, transactional order, voucher lock, idempotency, outbox, CAPTCHA/rate limit |
| Product voucher discovery | Code/schema implemented; active catalog unpopulated | Resolver/dialog/final quote contracts exist; `it_tech_db` currently has 0 vouchers, so product detail safely hides the section |
| Product promotion display | Code/schema implemented; active catalog unpopulated | Admin CRUD, scope/schedule/priority resolver, and detail rendering exist; `it_tech_db` currently has 0 product promotions |
| Product video and specification utilities | Implemented locally | Detail payload safely normalizes legacy YouTube video data, utility cards are data-conditional, and the video/specification dialogs support keyboard close, focus containment, and trigger-focus restoration |
| Customer accounts | Implemented | Registration/OTP/login/reset/profile/address/order flows and admin CRM surfaces exist |
| Admin auth and RBAC | Implemented | Session, role/permission checks, write gate, audit surfaces, login throttling |
| Admin content/catalog | Implemented first production-oriented pass | Product/category/article/menu/banner/collection/voucher/customer/order/user/role management |
| Search | Implemented | Runtime search in `web-admin`, prewarm/single-flight, signed webhook; `search-tool` is reference only |
| Runtime topology | Implemented as configuration | Caddy, PM2, readiness/liveness, two API workers, storefront, background worker |
| Database cutover | Applied to `it_tech_db` | Original 285-table empty schema retained; safe-config run 1 copied 5,170 whitelisted rows; `hanoi23_db` remained read only; current 342 physical tables include retained run-scoped recovery tables |
| PCMarket category import | Applied to `it_tech_db` | Run 2 imported 788 categories and 788 unique routes; 60 roots, depth 3, 722/66 status; run 3 applied all 162 category-attribute links |
| PCMarket product import | Applied to `it_tech_db` | Run 3 imported 4,712 products/search rows, 14,455 category links, 17,603 attribute links, 91 brands, 45 attributes, and 426 values; images remain remote HTTPS PCMarket URLs; incomplete variant/config/combo data remains audit-only pending |
| PCMarket brand sync | Applied to `it_tech_db` | Corrected run 5 retains 91 source audit records and 89 runtime brands after E-DRA/TEAMGROUP merges; 89 UTF-8 info rows, 1,209 brand-category rows, 13 remote logos, 80 homepage brands, and zero alias references |
| Database transfer | Locally verified | Full SQL archive restored into a disposable database with 342 tables, 152,141 rows, 1 routine, 2 triggers, and matching critical catalog counts; destination-version compatibility still requires target testing |
| Functional verification | Passed for imported catalog | Both typecheck/lint/build pipelines pass; 66/66 unit tests, default integration suite, disposable category/product/brand apply+rollback, and transitional 15/15 runtime healthcheck passed; strict mode is 13/15 because collections remain intentionally absent/404 |
| 1,500-VU capacity | Not yet verified | Full k6 production-like run remains a release blocker |

## Completed implementation highlights

- Added dynamic product/news category trails to existing API payloads, fixed the legacy news-category join, and replaced four breadcrumb implementations with one accessible responsive component.
- Split the product-detail related-content placeholder into similar, recently viewed, and related-post sections; added bounded recommendation and batch-card contracts without schema changes.
- Replaced hardcoded Why Buy content with independent product/category buying guides, a reusable admin editor, bounded transactional APIs, detail-only reads, and selective catalog-detail cache invalidation.
- Added canonical Zod validation and bounded parsing for high-risk commerce/customer routes.
- Added request IDs, safe public error envelopes, origin allowlist, `Retry-After`, atomic rate limits, honeypots, and action-specific reCAPTCHA.
- Reworked order creation around one quote/transaction, bulk item insert, voucher locking, idempotency replay, customer metrics, and email outbox.
- Added Argon2id password writes with bcrypt compatibility/upgrade and improved sliding session expiry.
- Added HMAC/timestamp/nonce protection for search webhook and image-content signature validation for uploads.
- Added DB-backed cross-worker cache versions, ETags, bounded filters/keys, search prewarm, and reduced public payloads.
- Upgraded storefront to Next.js 16.2.9/React 19.2.4 and added a committed ESLint configuration.
- Added Caddy/PM2 topology, background job runner, readiness/liveness, unit/integration tests, benchmark script, and k6 scenario.
- Cut over to the empty `it_tech_db`, copied only approved safe configuration, then imported PCMarket categories, products, attributes, search data, and canonical brands through guarded, auditable, rollback-capable workflows.
- Added canonical brand APIs/pages/homepage data and kept all imported images as validated absolute PCMarket HTTPS URLs.
- Generated a portable full SQL archive, verified its checksum, restored it into a disposable database, compared schema/counts, and documented CLI/phpMyAdmin transfer procedures.

## Latest verification matrix

| Check | Result |
|---|---|
| `web-admin` TypeScript | Pass |
| `font-end` TypeScript | Pass |
| `web-admin` ESLint `--quiet` | Pass |
| `font-end` ESLint `--quiet` | Pass |
| `web-admin` production build | Pass |
| `font-end` production build | Pass |
| Web-admin unit tests | 66/66 pass; rerun during the 2026-07-13 documentation audit |
| Default DB integration suite | 3 pass, 4 environment-gated skips; rerun during the 2026-07-13 documentation audit |
| Destructive importer integration | Category, product, and brand apply/rollback passed independently on disposable databases, then the databases were dropped |
| npm audit in both apps | 0 known vulnerabilities |
| Local healthcheck | `LOCAL_HEALTHCHECK_EMPTY_CATALOG=true`: 15/15 pass; strict default: 13/15 because API/storefront collection routes intentionally return 404 |
| Full database restore | Pass: 342 tables, 152,141 rows, 1 routine, 2 triggers; 788 categories, 89 brands, 4,712 products/search rows |
| Liveness/readiness/storefront | HTTP 200 |
| Invalid quote/origin/order-key/webhook probes | Expected safe 4xx/5xx responses |
| Full k6 1,500 VU | Not run on production-like host |
| Playwright + axe | Desktop 2/2 and mobile 2/2 pass |
| Lighthouse CI | Configuration added; local Windows Chrome run was inconclusive because the temporary profile cleanup failed with `EPERM`, so staging artifacts remain required |
| Regression bundle budget | Pass: product 219.9 KB; commerce 157.5-167.0 KB |
| Strict release bundle budget | Product detail fails 219.9 KB >205 KB; commerce passes <170 KB |

## Latest local performance observations

| Measurement | Observed |
|---|---:|
| Products cold / warm | ~28.1 ms / ~3.1 ms |
| Search cold / warm | ~126.1 ms / ~2.0 ms |
| Homepage bootstrap cold / warm | ~21.6 ms / ~4.8 ms |
| Header payload | 51,415 bytes, down from 99,097 |
| Homepage bootstrap payload | 96,610 bytes, down from 148,256 |

These results are development-machine observations and must not be used as production SLO evidence.

## Prioritized next work

1. Import missing variant/config-group/comboset definitions only after complete source exports are available and reconcile the pending audit records.
2. Run the complete read/commerce/abuse k6 scenarios on an isolated target-like host and capture application, MySQL, CPU, RAM, pool, and slow-query metrics.
3. Validate production reCAPTCHA hostnames/actions/scores in shadow mode, then enable enforcement in a coordinated frontend/backend release.
4. Exercise database restore, graceful PM2/Caddy restart, worker crash recovery, outbox retry/backoff, and cleanup against staging.
5. Add integration/E2E coverage for remaining write-route groups and forms; focus on upload, RBAC, OTP/session revoke, concurrent vouchers, `429`, keyboard/focus, and offline failures.
6. Audit remaining legacy admin screens for API parity, canonical Zod schemas, and uniform field-level error UX.
7. Define retention and tested cleanup for import backup tables after formal catalog acceptance.

## Known risks and blockers

- Capacity is not certified until the full k6 release gate passes.
- CAPTCHA enforcement depends on production site/secret keys and allowed hostnames; a missing or mismatched configuration can block real users.
- Search webhook updates depend on a shared strong `SEARCH_WEBHOOK_SECRET`.
- MySQL shares the target host with the applications. If CPU/RAM/pool/SLO targets fail, separate MySQL or add another host.
- The database still mixes InnoDB and MyISAM and mostly contains legacy latin1 data; transaction/encoding behavior cannot be assumed across all old tables.
- Run-scoped import backups intentionally inflate physical table/engine counts; deleting them without a run-aware retention and rollback plan can remove the fastest recovery path.
- PCMarket variant/config/comboset references are audit-only pending data, not complete sellable runtime configuration.
- Shared validation/security foundations cover the highest-risk routes, but the project should not claim every legacy admin field has been converted to canonical Zod without a route-by-route follow-up audit.

## Verification commands

Use the command blocks in `AGENTS.md`. Use `npm.cmd run local:healthcheck` and `npm.cmd run local:benchmark` from `web-admin` while both apps are running. Use `npm.cmd run load:k6` only against an approved isolated target.
