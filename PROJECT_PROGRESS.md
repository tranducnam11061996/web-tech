# Project Progress

Last updated: `2026-07-13`

`AI_HANDOFF.md` is the canonical continuation guide. This file records completion evidence, open verification, and the prioritized backlog.

## Current status

| Area | Status | Evidence / qualification |
|---|---|---|
| Real combo sets / combo cart / combo orders | Implemented locally; E2E assignment pending | Local migration ran twice successfully; product detail chunks more than four combo groups into four-card thumbnail slides without extra requests, and combo cart/checkout use the standard dark commerce shell while retaining isolated storage/API/voucher behavior; MSI 87409 remains intentionally unassigned |
| Storefront catalog/search/collections | Implemented and locally verified | Bounded APIs, ETag, reduced payloads, cache/single-flight, responsive image behavior |
| Performance/UX optimization | Implemented; strict product bundle target pending | Core/supplemental streaming, byte-bounded SWR cache, ETag/timing/metrics, same-origin browser APIs, quote debounce, image/motion improvements, desktop/mobile axe checks |
| Dynamic breadcrumbs | Implemented and locally verified | Shared semantic component; bounded product/news hierarchy resolver; no extra storefront request or document overflow |
| Product related content | Implemented | Similar products with direct-parent fallback, title-ranked/fallback news, and versioned browser-local recently viewed history |
| Product/category buying guides | Implemented and locally verified | Independent admin-managed content, detail-only API payload, accessible storefront accordion, selective cache invalidation; migration idempotency/schema verified |
| Product groups / independent SKU variants | Implemented and locally verified | Real legacy-backed admin CRUD, one-group-per-product index, detail-only payload with per-SKU legacy thumbnail resolution, simplified value schema without image/color columns, four-card storefront carousel, orphan-safe reads |
| Guest cart and checkout | Hardened and locally verified | Strict quote, transactional order, voucher lock, idempotency, outbox, CAPTCHA/rate limit |
| Product voucher discovery | Implemented and locally verified | Product-detail resolves active global/category-descendant vouchers; storefront hides only an empty voucher card while retaining the independent live product-promotion block, and uses an accessible code/detail dialog; final quote remains authoritative |
| Product promotion display | Implemented and locally verified | Admin CRUD with SKU/category-union scopes, descendant matching, safe links, scheduling and priority; product detail replaces the former demo list with at most 50 live display-only records |
| Product video and specification utilities | Implemented locally | Detail payload safely normalizes legacy YouTube video data, utility cards are data-conditional, and the video/specification dialogs support keyboard close, focus containment, and trigger-focus restoration |
| Customer accounts | Implemented | Registration/OTP/login/reset/profile/address/order flows and admin CRM surfaces exist |
| Admin auth and RBAC | Implemented | Session, role/permission checks, write gate, audit surfaces, login throttling |
| Admin content/catalog | Implemented first production-oriented pass | Product/category/article/menu/banner/collection/voucher/customer/order/user/role management |
| Search | Implemented | Runtime search in `web-admin`, prewarm/single-flight, signed webhook; `search-tool` is reference only |
| Runtime topology | Implemented as configuration | Caddy, PM2, readiness/liveness, two API workers, storefront, background worker |
| Database cutover | Applied to `it_tech_db` | Original 285-table empty schema retained; safe-config run 1 copied 5,170 whitelisted rows; `hanoi23_db` remained read only; verified pre/post-bootstrap logical backups retained outside Git |
| PCMarket category import | Applied to `it_tech_db` | Run 2 imported 788 categories and 788 unique routes; 60 roots, depth 3, 722/66 status; run 3 applied all 162 category-attribute links |
| PCMarket product import | Applied to `it_tech_db` | Run 3 imported 4,712 products/search rows, 14,455 category links, 17,603 attribute links, 91 brands, 45 attributes, and 426 values; images remain remote HTTPS PCMarket URLs; incomplete variant/config/combo data remains audit-only pending |
| PCMarket brand sync | Applied to `it_tech_db` | Corrected run 5 retains 91 source audit records and 89 runtime brands after E-DRA/TEAMGROUP merges; 89 UTF-8 info rows, 1,209 brand-category rows, 13 remote logos, 80 homepage brands, and zero alias references |
| Functional verification | Passed for imported catalog | Both typecheck/lint/build pipelines pass; 66/66 unit tests, default integration suite, disposable category/product/brand apply+rollback, and 15/15 runtime healthcheck passed; collections remain intentionally absent/404 |
| 1,500-VU capacity | Not yet verified | Full k6 production-like run remains a release blocker |

## Completed in the latest hardening pass

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

## Latest verification matrix

| Check | Result |
|---|---|
| `web-admin` TypeScript | Pass |
| `font-end` TypeScript | Pass |
| `web-admin` ESLint `--quiet` | Pass |
| `font-end` ESLint `--quiet` | Pass |
| `web-admin` production build | Pass |
| `font-end` production build | Pass |
| Validation, cache/ETag, catalog features, and legacy category-import unit tests | 55/55 pass |
| Existing DB integration tests | 4/4 pass; destructive category swap/rollback fixture also passed on `it_tech_db_import_test`, which was dropped afterward |
| npm audit in both apps | 0 known vulnerabilities |
| Local healthcheck | 11/11 pass in `LOCAL_HEALTHCHECK_EMPTY_CATALOG=true` mode with category ID 30 |
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

1. Run the complete `load:k6` scenario on an isolated target-like host and capture application, MySQL, CPU, RAM, pool, and slow-query metrics.
2. Validate production reCAPTCHA hostnames/actions/scores in shadow mode, then enable enforcement in a coordinated frontend/backend release.
3. Exercise graceful PM2/Caddy restart, worker crash recovery, outbox retry/backoff, and cleanup against staging.
4. Add integration/E2E coverage for every write-route group and all 15 forms; focus on upload, RBAC, OTP/session revoke, concurrent vouchers, `429`, keyboard/focus, and offline failures.
5. Audit the remaining lower-risk legacy admin write forms for canonical Zod field schemas and uniform field-level error UX.
6. Re-run DB query plans under load and add only benchmark-supported indexes.
7. Review root scratch/debug artifacts separately; preserve them until the owner authorizes removal.

## Known risks and blockers

- Capacity is not certified until the full k6 release gate passes.
- CAPTCHA enforcement depends on production site/secret keys and allowed hostnames; a missing or mismatched configuration can block real users.
- Search webhook updates depend on a shared strong `SEARCH_WEBHOOK_SECRET`.
- MySQL shares the target host with the applications. If CPU/RAM/pool/SLO targets fail, separate MySQL or add another host.
- The database still mixes InnoDB and MyISAM and mostly contains legacy latin1 data; transaction/encoding behavior cannot be assumed across all old tables.
- Shared validation/security foundations cover the highest-risk routes, but the project should not claim every legacy admin field has been converted to canonical Zod without a route-by-route follow-up audit.

## Verification commands

Use the command blocks in `AGENTS.md`. Use `npm.cmd run local:healthcheck` and `npm.cmd run local:benchmark` from `web-admin` while both apps are running. Use `npm.cmd run load:k6` only against an approved isolated target.
