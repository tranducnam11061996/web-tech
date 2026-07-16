# Project Progress

Last updated: `2026-07-16`

`AI_HANDOFF.md` is the canonical continuation guide. This file records completion evidence, open verification, and the prioritized backlog.

## Current status

| Area | Status | Evidence / qualification |
|---|---|---|
| Real combo sets / combo cart / combo orders | Code/schema implemented; active catalog unpopulated | Combo API/UI/quote/order behavior exists, but `it_tech_db` has 0 combo sets/relations; 1,121 imported comboset occurrences remain pending audit because source runtime configuration is incomplete |
| Storefront catalog/search/collections | Implemented and locally verified | Bounded APIs, ETag, reduced payloads, cache/single-flight and responsive images. Collection detail presents a visible collection H1 before sanitized DB description HTML, then a gradient-name/solid-count H2 above its 24-item grid; it exposes only canonical low/high price sort links plus Link pagination and uses six/four/three/two columns across `xl`/`lg`/`sm`/mobile. Collection detail and Homepage Sections 8, 10 and 11 share one product-card DOM/style contract; a 260px CSS-container threshold keeps prices, stock state and cart action aligned without overflow. Category headings and SSR titles still fall back from invalid SEO titles to the category name. |
| Homepage featured collection carousel | Implemented and browser-tested | Section 8 renders ten sellable products from collection 896 through the existing bootstrap, remains server-rendered, and uses the shared `ProductGridCard` inside 280px desktop / 180px mobile carousel items. It provides matching accessible previous/next arrow controls, canonical product links and cart actions. The homepage-only raw script ported from `index.html` controls every non-hero `.carousel-track` with a one-card buffer, optional clones, three-second auto-slide, mouse/touch threshold gestures, hover pause, indicators and resize recalculation; pointer movement suppresses its synthesized card click, and the Next adapter owns init/destroy cleanup without adding client state. |
| Homepage gift product carousel | Implemented and browser-tested | Section 10 keeps category 137, its eight-product server-bootstrap payload, CTA and carousel behavior while rendering shared `ProductGridCard` instances in direct 280px desktop wrappers and the existing two-card mobile/tablet width formula. The shared renderer defaults to legacy cards, so Section 6 and Section 17 are unchanged. Focused coverage verifies canonical hooks, cart keyboard behavior, square media, four overflow widths, accessibility and drag without navigation or a browser product-section request. |
| Homepage category-feature sections | Implemented, migrated, and browser-tested | Section 11 derives safe category targets, loads up to nine distinct sellable products across enabled descendants in `ordering DESC, id DESC` order, and renders the responsive half-row hero / 3 + 6 product layout. Admin hides but preserves the prior category-page flag, supports two-line headlines, mirrored copy, and arbitrary container color. The additive color-column migration ran twice after a restore-verified backup; focused unit/integration and desktop/mobile Playwright coverage pass. |
| Performance/UX optimization | Implemented foundation; current JS budgets failing | Core/supplemental streaming, byte-bounded SWR cache, ETag/timing/metrics, same-origin browser APIs, quote debounce, image/motion improvements; current build exceeds regression/release limits on product, cart, checkout, and combo-checkout |
| Durable page views | Implemented and locally verified | Four public page types emit idempotent same-origin events; worker batches into canonical BIGINT totals without hot writes to legacy content rows. Restore-verified migration and local HTTP/browser/integration checks pass; 150-RPS staging gate remains pending. |
| Dynamic breadcrumbs | Implemented and locally verified | Shared semantic component; bounded product/news hierarchy resolver; no extra storefront request or document overflow |
| Product related content | Implemented | Similar products with direct-parent fallback, title-ranked/fallback news, and versioned browser-local recently viewed history |
| Product/category buying guides | Code/schema implemented; active catalog unpopulated | Independent admin-managed content, detail-only API payload, accessible storefront accordion, and selective cache invalidation exist; `it_tech_db` currently has 0 guides |
| Product groups / independent SKU variants | Code/schema implemented; active catalog unpopulated | Admin CRUD, one-group-per-product index, detail-only payload, thumbnail resolution, carousel, and orphan-safe reads exist; current config-group tables have 0 rows and imported variant/config references remain audit-only |
| Guest cart and checkout | Hardened and locally verified | Strict quote, transactional order, voucher lock, idempotency, outbox, CAPTCHA/rate limit |
| Product voucher discovery | Code/schema implemented; active catalog unpopulated | Resolver/dialog/final quote contracts exist; `it_tech_db` currently has 0 vouchers, so product detail safely hides the section |
| Product promotion display | Implemented and locally verified | Admin CRUD, scope/schedule/priority resolver, and detail rendering exist. Create/edit modals clear the fixed header by 80px; priority is a strict text integer field; optional detail URLs suppress links. Product detail appends sanitized paragraph/line/list-item promotions from legacy `specialOffer` after all managed promotions and continues one number sequence without a new request. `it_tech_db` currently has one enabled managed promotion, applying to product 12767. |
| Product video and specification utilities | Implemented locally | Detail payload safely normalizes legacy YouTube video data, utility cards are data-conditional, and the video/specification dialogs support keyboard close, focus containment, and trigger-focus restoration |
| Customer accounts | Implemented | Registration/OTP/login/reset/profile/address/order flows and admin CRM surfaces exist |
| Customer product favorites | Implemented, migrated, and browser-tested | Additive customer/product relation, authenticated bounded APIs, batched mounted-card status, login continuation, and standalone cursor-paginated `/yeu-thich` page; live table starts empty |
| Admin auth and RBAC | Implemented and local-login recovered | Session, role/permission checks, write gate, audit surfaces, login throttling; development CSP permits React/Turbopack `unsafe-eval` only outside production, local CAPTCHA bypass and a `200` admin login regression check passed |
| Footer Menu | Implemented, published, and locally verified | Dedicated draft/publish menu `footer`, admin screen/API, public ETag endpoint, and 4 fixed footer groups / 26 active `#` links; existing Footer markup/CSS is unchanged |
| Bottom Footer | Implemented, published, and locally verified | Dedicated draft/publish menu `bottom_footer`, admin screen/API, public ETag endpoint, and one fixed Trusted Partners group / 19 active `#` links; existing Footer markup/CSS is unchanged |
| Admin content/catalog | Implemented first production-oriented pass | Product/category/article/menu/banner/collection/voucher/customer/order/user/role management; the collection editor uses a responsive 2x2 control grid, a keyboard-accessible searchable parent tree, clear Vietnamese boolean labels, preserves hidden legacy icons, and shares the inset native-select arrow contract with the storefront |
| Admin rich-text editor | Implemented and locally verified | Shared offline GPL TinyMCE keeps its dark theme, hides the promotion CTA/container, and exposes the existing full-width menubar/wrapping toolbar unchanged. Its native `Insert/Edit Image` dialog now includes an image-only file picker across product, category, collection and article editors; uploads are scope/RBAC checked, signature validated and resolved to durable local-media URLs without Base64 content. |
| Article-category featured state | Implemented and migrated | Edit exposes strict `Không`/`Nổi bật` 0/1 choices; the list has an accessible focused toggle backed by an RBAC/write-gated PATCH. Additive metadata was backfilled for all eight categories without changing the legacy import table, and transaction/validation tests pass. |
| Storefront news-category template | Implemented and browser-tested | `/tin-tuc/[category-slug]` uses the reference HTML's bento plus 70/30 layout with real API data, canonical pagination, database-featured sidebar categories, global popular news and a reusable promo banner. Featured categories are isolated in reusable Server Component `FeaturedNewsCategories` with a `NewsCategory[]` prop; the ranking panel is isolated in reusable Server Component `MostReadNews` with a `NewsItem[]` prop. The intermediate category-filter/sort strip is removed; direct sort URLs remain compatible. The promo is sticky at `top: 110px` on desktop and normal-flow on mobile. The page remains server-first, has no database access, and desktop/mobile geometry and edge states pass. |
| Storefront news landing template | Implemented and browser-tested | `/tin-tuc` binds real data into `page-tin-tuc.html`'s 2 + 3 hero, six-item list, normal-flow featured/promotion sidebar, PCM Official playlist and 2 + 4 review grid. `GET /api/news/landing` owns configured-category membership/deduplication and safe YouTube-feed aggregation; the storefront remains database-free and only the playlist interaction hydrates. Missing categories/feed data render explicit empty/error states without sample cards. |
| Storefront news-article template | Implemented and browser-tested | `/tin-tuc/[article-slug]` binds real data into `single-bai-viet.html` with the reference 70/30 layout, sanitized content, real metadata/tags, six newest same-displayed-category articles and an accessible Facebook/X/copy island. The right sidebar directly imports all three reusable panels, omits “Cùng danh mục”, and keeps the promo sticky at `top: 110px` only on desktop. |
| Admin attribute management | Implemented and locally verified | Real list/search/sort/bulk controls and transactional attribute/value/category CRUD; all 426 value ApiKeys are populated, editable, slug-validated and authoritative for public filters; destructive integration test is disposable-database gated and was not run against `it_tech_db` |
| Category attribute filters | Implemented and locally verified | Sidebar metadata and product filtering share one versioned resolver and the stored value ApiKey; unmapped Local values fall back to actual sellable product assignments. Category 1106 returns brand + 9 groups / 39 values, and `cpu=amd-ryzen-7` reduces the 423-product scope to 79 products |
| Search | Implemented and locally verified | Runtime search in `web-admin`, prewarm/single-flight and signed webhook; exact `PC` uses a positive title-intent gate before pagination/facets, removing `PCM`/`PCIe`/accessory false positives while retaining complete PC bundles. The active catalog returns 580 valid PC products across 25 pages instead of 641/27; `search-tool` is reference only. |
| Runtime topology | Implemented as configuration | Caddy, PM2, readiness/liveness, two API workers, storefront, background worker |
| Database cutover and runtime collation | Applied and accepted on `it_tech_db` | Runtime points to `it_tech_db`; accepted recovery cleanup plus additive article-category metadata/page-view tables leaves zero Latin-1 tables/columns and 292 physical tables; `hanoi23_db` remained untouched |
| PCMarket category import | Applied to `it_tech_db` | Run 2 imported 788 categories and 788 unique routes; 60 roots, depth 3, 722/66 status; run 3 applied all 162 category-attribute links |
| Product category routes/tree scope | Applied and locally verified | 788/788 routes are canonical with zero hash/orphan/duplicate failures; enabled descendant scope is shared by product/count/price/filter APIs; category 521 returns 34 distinct enabled products |
| Product-description disclosure | Implemented and browser-tested | Long descriptions keep their visible bounded preview and expand/collapse with a native accessible control; the article body is never hidden in the initial state |
| Product-description missing-article fallback | Implemented and browser-tested | Products without article HTML reuse the existing disclosure/content structure, show their name without the `Đánh giá:` prefix plus the existing thumbnail and an unmarked normalized `proSummary` list; the collapse-height reference and article path are retained |
| Responsive product technical specifications | Implemented and production-tested | On desktop, a naturally taller specification table clips to the description's collapsed height and keeps the modal action; the independent outer boundary follows the current description height so `top-6` sticky persists until its bottom. A fitting table renders fully without an overlay/action. Mobile retains the existing `66vh` behavior |
| Empty similar-product detail section | Implemented and browser-tested | The entire similar-products region is omitted when the supplemental recommendation list is empty; other product-detail related sections remain independent |
| Product-detail quick specifications | Implemented and browser-tested | Summaries with at most five non-empty rows show in full without a toggle; longer summaries show five rows initially and expand/collapse through an accessible native button |
| Storefront catalog pagination | Implemented and browser-tested | Category/search pagination is URL-driven and SSR-safe; page-two reload/history works, filters reset to page one, and API failures render an inline retry instead of the route error boundary |
| Progressive image hydration | Implemented and production-smoked | Cached success and failure are reconciled after hydration across the shared image component; 16/16 Playwright and category/product/news smoke report zero loaded images stuck blurred |
| Product-card image framing | Implemented and production-tested | Real product cards use a non-shrinking square frame with centered `object-fit: contain`; portrait/landscape/square assets and all supported card surfaces pass desktop/mobile and four-breakpoint checks |
| PCMarket product import | Applied to `it_tech_db` | Run 3 imported 4,712 products/search rows, 14,455 category links, 17,603 attribute links, 91 brands, 45 attributes, and 426 values; images remain remote HTTPS PCMarket URLs; incomplete variant/config/combo data remains audit-only pending |
| PCMarket brand sync | Run 8 applied and accepted on `it_tech_db` | Public PCM policy maps `0 -> 96`; E-DRA/TEAMGROUP keep `34 -> 25` and `57 -> 31`; runtime has 90 brand/info rows, 1,587 brand-category rows, PCM 2,276/849 products, and zero noncanonical references |
| PCMarket article-category import | Applied to `it_tech_db` | Run 6 imported 4 enabled UTF-8 root categories with source IDs, `.html` routes, registry/map/record audit rows, and no article/menu writes; clone apply/verify/rollback and live smoke passed |
| PCMarket article import | Applied to `it_tech_db` | Run 7 imported 668 articles/content rows, 705 unique category links and 668 routes/registry/maps; ID 83 is quarantined and no menu was created |
| Database transfer | Current pre-page-view backup restore-verified; post-migration export still required for machine transfer | The fresh rollback artifact has 290 tables/84,299 rows and current accepted schema has 292 tables. Create a new post-migration export before moving machines; destination-version compatibility still requires target testing. |
| Functional verification | Required compile/test/build matrix and controlled browser suite pass; performance gates remain pending | Both typecheck/lint/build pipelines pass; 144/144 unit tests and default integration 17 pass/7 fixture- or safety-gated skips. Focused strict-PC browser smoke canonicalizes page 27 to page 25 and renders only valid PC cards; focused product-promotion Playwright passes 2/2 desktop/mobile; the last full four-worker run remains 107 pass/19 expected skips across 126 cases. Strict health is 13/15 because its configured legacy collection probes return 404; documented empty-catalog mode is 15/15. |
| 1,500-VU capacity | Not yet verified | Full k6 production-like run remains a release blocker |

## Completed implementation highlights

- Replaced the rejected Section 8-specific React carousel with the raw homepage algorithm from `font-end/index.html`. Section 8 now renders only its server-provided collection markup, while one homepage script controls every non-hero `.carousel-track` through the reference one-card buffer, 400 ms transform/reset, three-second timer, mouse/touch gestures, hover pause, indicators and resize behavior. A lifecycle adapter removes clones, inline state, timers and listeners before Next.js remounts.
- Added an opt-in shared-card variant to the existing Section 6/10/17 homepage product renderer and enabled it only for Section 10. Category data, CTA markup, SSR/bootstrap flow and carousel mechanics stay unchanged while the product presentation now follows Section 11.
- Rebuilt `/collection/[slug]` as a server-rendered collection surface: safe database-authored description markup appears first without typography overrides; sort and pagination are canonical URL links; the fixed 24-product grid renders six/four/three/two columns without horizontal card overflow; empty descriptions, empty collections and one-page collections omit their unused regions.
- Backfilled all 426 legacy attribute values with collision-free canonical ApiKeys, made the admin field required/editable, and changed category/search payloads, URL state and backend matching to use the stored key instead of rebuilding a slug from the display name.
- Added customer product favorites end to end: an InnoDB relation with customer cascade and logical product cleanup, session-only list/status/idempotent mutation APIs, mounted-card status batching, optimistic synchronized hearts, login-save continuation, a noindex `/yeu-thich` grid with retry/load-more/remove, and header entry points. A restore-verified pre-migration backup and disposable clone trial preceded the live migration.
- Repaired product-description disclosure so its preview is visible while collapsed; a focused client wrapper owns only the expand state and preserves the server-rendered sanitized article body.
- Added a server-rendered no-article product-description fallback: it reuses the thumbnail and normalized summary lines in semantic but visually unmarked list markup, while retaining the normal article disclosure whenever article HTML exists.
- Added a minimal client-only height controller around server-rendered technical specifications. It batches live DOM measurements, handles streamed node replacement and responsive changes, retries transient zero-size startup measurements, keeps the visible preview tied to the collapsed description height, and drives an independent current-height sticky boundary plus CSS-only `pending`/`clipped`/`full` states without serializing the specification HTML.
- Removed the product-detail similar-products empty state: no recommendation cards now means no heading, card frame, grid, or section semantics in the rendered page.
- Replaced the broken closed `<details>` summary with a five-row preview and native ARIA disclosure; all rows remain in the DOM, hidden overflow is removed from the accessibility tree, and product changes reset the preview to collapsed.
- Replaced the mount-time progressive-image reset with source-bound state plus cached DOM reconciliation, preserving callbacks/fallbacks while preventing cached hard refreshes from remaining at `blur-sm`/`blur-md` loading styles.
- Standardized real product-card media on one CSS-only square/contain contract and aligned its loading skeleton; `flex-shrink: 0` preserves the square inside constrained legacy mobile cards.
- Replaced invalid client-side `new URL('/api/...')` construction in category/search pagination with same-origin rewritten requests, canonical `?page=N` state, bounded SSR page parsing, request cancellation, local retry UX, and accessible pagination controls.
- Repaired all 788 live product-category routes from legacy type `0` to `product:category` with exact preimage hash `7ad32ed2cbdc7ccc99b3f89703d637c8592a28b8209b21074eec70cc6ada18c7`; no route hash, orphan, or duplicate changed.
- Added exact-prefix catalog resolution, canonical route writes in the importer/admin, read-only applied-route assertions, guarded external-artifact repair/rollback, shared enabled-descendant scope, category cache invalidation, and the measured `(parentId,status,id)` index.
- Category 521 now resolves through 29 enabled nodes to 34 distinct enabled products across pagination, price bounds, brand and attribute filters. Its storefront and a child route render on port 3001; disabled category 71 stays 404 and product/news detail stays 200.
- Restore-verified pre/post cutover backups (`e47e5232...` / `4d7c5249...`) preserve the 288-table, 84,049-row database. Source verification still matches categories/products/brands/article categories; article source has two new, unimported records (682/683) under hash `aaeda512...`.
- Added public PCM fallback policy (`0 -> 96`), future source-ID collision protection, durable audit mapping, read-only `--verify-applied`, rollback-window closure, and guarded exact-name recovery cleanup.
- Clone trial applied run 8, verified all relations/API counts, rolled back to the exact baseline, applied again, added measured news indexes, dropped 88 clone recovery tables, and passed healthcheck on the 288-table lean schema.
- Live run 8 applied the stable brand hash, added four news indexes, closed runs 2-8 after a restore-verified 362-table backup, and removed exactly 74 recovery tables. Final live state is 288 tables (160 InnoDB/128 MyISAM), zero Latin-1/recovery/stage/restore objects, and `ADMIN_WRITE_ENABLED=false`.
- Replaced news category `OR` membership/dependent subqueries with `UNION DISTINCT`; EXPLAIN selects the status/date, URL/status, and both covering junction indexes.

- Added guarded `pcmarket/article-categories` dry-run/apply/rollback with strict Zod validation, bounded HTTPS-only double snapshots, canonical SHA-256 locking, source-tree/route/media validation, advisory locking, exact empty-target guards, and retained run-scoped backups.
- Restored the fresh pre-import dump into `it_tech_db_article_category_test_20260713_203630`; clone run 6 applied and verified all four categories/routes/audit relations, then rollback restored the exact empty state while retaining the imported snapshot.
- Applied live run `6` with snapshot `0a3d22d053ec9feb5f6eadf752b4191a240b5e0010515f671a84fd0a34204b04`. The database now has 4 article categories, 4 canonical routes, 4 registry/map/record entries, 0 articles/links/menu references, 346 tables, and 152,162 exact rows; catalog/search/full-text/routine/trigger counts are unchanged.
- Restarted web-admin, storefront, and worker with persisted `ADMIN_WRITE_ENABLED=false`; all four `/api/news-category/<slug>` and `/tin-tuc/<slug>` paths return 200 with correct UTF-8 names and `totalNews=0`, and the healthcheck passed 15/15.
- Added guarded `pcmarket/articles` dry-run/apply/rollback with strict two-pass snapshots, ID 83 quarantine, duplicate-category removal, HTML/HTTPS normalization, MyISAM staging/swap, InnoDB compensation and exact run backups.
- Applied live run `7` with hash `0ef9d19c682182113ce43d70b9cb6eb21045a0fb7041287a288716c78b1fab13`: 668 article/content rows, 705 unique links, 668 routes/registry/maps and 669 audit records. Catalog/search/full-text/routine/trigger invariants remained unchanged.
- Replaced demo news UI with active-only paginated APIs/pages, absolute PCMarket images, true 404s, local canonical/Open Graph metadata, bounded related news and defense-in-depth HTML sanitization.

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
| Web-admin unit tests | 144/144 pass, including strict PC intent/exclusion/synonym regressions, product-editor promotion splitting/sanitization/ordering, canonical page-view validation, rich-text uploads, optional promotion links and strict priority validation |
| Admin local login regression | Pass: CSP development header includes `unsafe-eval`, local CAPTCHA bypass accepts the empty development token, and `POST /api/admin/auth/login` returned `200` |
| Default DB integration suite | 17 pass, 7 environment- or safety-gated skips; public product detail verifies managed-before-editor promotion projection without exposing raw HTML; destructive CRUD/import tests remain correctly gated |
| Destructive importer integration | Category, product, and brand apply/rollback passed independently on disposable databases, then the databases were dropped |
| npm audit in both apps | 0 known vulnerabilities |
| Local healthcheck | Current strict rerun: 13/15; both configured legacy collection probes return 404. Current documented empty-catalog mode passes 15/15. |
| Full database restore | Final lean bundle pass: 288 tables, 84,040 rows, 1 routine, 2 triggers; 788 categories, 90 brands, 4,712 products/search rows and 668 articles/content rows |
| Liveness/readiness/storefront | Initially HTTP 200; MySQL was no longer listening at audit end, so readiness then returned 503 and requires a runtime rerun after database restart |
| Invalid quote/origin/order-key/webhook probes | Expected safe 4xx/5xx responses |
| Full k6 1,500 VU | Not run on production-like host |
| Playwright + axe | Last full controlled four-worker run: 107 pass/19 expected project/device/data skips across 126 desktop/mobile cases. The focused product-promotion regression adds 2/2 passing desktop/mobile checks for managed-before-editor order, numbering, formatting, overflow and Axe. |
| Lighthouse CI | Configuration added; local Windows Chrome run was inconclusive because the temporary profile cleanup failed with `EPERM`, so staging artifacts remain required |
| Regression bundle budget | Fail: product 236.8 KB, cart 175.5 KB, checkout 190.8 KB, combo-checkout 187.4 KB; combo-cart passes at 167.7 KB |
| Strict release bundle budget | Same four routes fail their stricter limits; combo-cart passes 167.7 KB <170 KB |

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

1. Preserve/transfer the dirty working tree plus ignored database/media/secrets using `NEW_MACHINE_SETUP.md`; restore-verify the destination.
2. Keep the restored local MySQL readiness and runtime/database assertions monitored.
3. Fix the current frontend JS-budget regressions; keep future full Playwright runs at the verified controlled concurrency.
4. Import missing variant/config-group/comboset definitions only after complete source exports are available and reconcile the pending audit records.
5. Run the complete read/commerce/abuse k6 scenarios on an isolated target-like host and capture application, MySQL, CPU, RAM, pool, and slow-query metrics.
6. Validate production reCAPTCHA hostnames/actions/scores in shadow mode, then enable enforcement in a coordinated frontend/backend release.
7. Exercise destination-version database restore, graceful PM2/Caddy restart, worker crash recovery, and outbox retry/backoff against staging.
8. Add integration/E2E coverage for remaining write-route groups/forms and audit legacy admin parity, canonical schemas, RBAC, accessibility, and error UX.

## Storefront validation status (2026-07-14)

- Added shared client validators and structured API errors retaining HTTP status, code, field paths, retry delay, and request ID.
- Registration and customer/commerce forms now report specific field, CAPTCHA, network, and server errors with accessible associations; checkout receiver/invoice/delivery validation is canonical on the backend.
- Quantity/voucher/search/price controls are bounded before navigation or quote calls. Newsletter and comments are explicitly unavailable instead of presenting fake submissions.
- No database schema or data changed. Production reCAPTCHA/SMTP environment verification remains a release gate.

## Known risks and blockers

- Capacity is not certified until the full k6 release gate passes.
- CAPTCHA enforcement depends on production site/secret keys and allowed hostnames; a missing or mismatched configuration can block real users.
- Search webhook updates depend on a shared strong `SEARCH_WEBHOOK_SECRET`.
- MySQL shares the target host with the applications. If CPU/RAM/pool/SLO targets fail, separate MySQL or add another host.
- The database still mixes InnoDB and MyISAM; transaction behavior cannot be assumed across all legacy tables even though character data is now fully UTF-8.
- Runs 2-8 no longer have in-database rollback tables. Recovery now depends on the verified external backup artifacts, which must be protected and periodically restore-tested.
- PCMarket variant/config/comboset references are audit-only pending data, not complete sellable runtime configuration.
- Shared validation/security foundations cover the highest-risk routes, but the project should not claim every legacy admin field has been converted to canonical Zod without a route-by-route follow-up audit.
- Current frontend regression/release JS budgets are red on four routes.
- Full Playwright is green at four workers; higher-concurrency local runs can still exhaust Windows resources and should not be treated as product failures without reproduction.

## Verification commands

Use the command blocks in `AGENTS.md`. Use `npm.cmd run local:healthcheck` and `npm.cmd run local:benchmark` from `web-admin` while both apps are running. Use `npm.cmd run load:k6` only against an approved isolated target.
