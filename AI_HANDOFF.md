# AI Handoff — HACOM Workspace

Last verified: `2026-07-16`

This is the canonical current-state handoff. Read in this order:

1. `AGENTS.md`
2. this file
3. `ARCHITECTURE.md`
4. `PROJECT_PROGRESS.md`
5. the README for the application being changed
6. `web-admin/database-docs/DATABASE_SCHEMA.md` for database work
7. `NEW_MACHINE_SETUP.md` and `web-admin/database-docs/DATABASE_TRANSFER.md` for a new machine

Use `PROJECT_AUDIT_2026-07-15.md` for the evidence and findings from the latest whole-workspace audit. Historical implementation detail remains in `CHANGELOG.md`; do not treat old counts in changelog entries as the current state.

## Repository state

- Repository: `tranducnam11061996/web-tech`.
- Branch: `main`.
- Committed HEAD: `6d3db1d289c04ee50881d1f3112c9c6c495ac39c` (`feat: complete storefront favorites and validation`), synchronized with `origin/main` at audit time.
- The working tree is intentionally dirty. It contains the uncommitted attribute-management/filter work, managed Footer/Bottom Footer menus, category SEO-title cleanup, mega-menu positioning, TinyMCE polish, tests, and documentation updates described below.
- Never reset, discard, or overwrite the working tree. Inspect `git status --short` and relevant diffs before editing.
- A fresh clone contains only HEAD and will not contain this uncommitted feature bundle. Commit it or transfer a patch plus untracked files before moving machines; follow `NEW_MACHINE_SETUP.md`.
- `search-tool` is a historical Git link/reference, not the production search implementation. It has no committed `.gitmodules` entry and must not be treated as a required runtime dependency.

## Ownership and runtime boundaries

- `web-admin` owns the admin UI, all public/admin/customer APIs, MySQL access, migrations/importers, uploaded-media serving, and the background worker.
- `font-end` owns the customer storefront. It consumes `web-admin` APIs and must never import a database client or receive database credentials.
- `search-tool` is historical only. Production search is in `web-admin`.
- Uploaded media lives under the external `MEDIA_ROOT` and is served by `web-admin /api/media/[...path]`.
- Local topology: `web-admin :3000`, `font-end :3001`, plus one background-worker process. The supplied production topology uses Caddy, two clustered API workers, one storefront worker, and one background worker.

## Current uncommitted feature bundle

The current working tree implements and documents the following related changes:

- Four public entity pages now record browser-rendered views through a shared null-rendering client tracker and bounded same-origin `POST /api/page-views`. UUID idempotency prevents Strict Mode/retry duplicates; refresh and client navigation create new events.
- `web_admin_page_view_events` durably queues accepted events and the background worker aggregates them into `web_admin_page_view_totals` in crash-safe batches. Canonical counts are `BIGINT`; legacy `visit` columns are not continuously updated.
- The page-view migration ran twice against identified `it_tech_db` after restore verification of backup `b2bfd6c86c21e89d326081e44b403049768244b624ae8f97acaae564674701de`. The schema is now 292 tables (164 InnoDB/128 MyISAM), with 6,176 backfilled totals and `ADMIN_WRITE_ENABLED=false` after migration.

- Admin attribute list/create/edit/delete/bulk-status flows backed by the real legacy attribute tables.
- Transactional value/category reconciliation and cascade cleanup. Destructive integration coverage remains gated to an explicitly disposable database.
- Canonical `idv_attribute_value.api_key` values. All 426 accepted live values were backfilled; public category/search filtering uses the stored key rather than rebuilding a slug from the label.
- Shared category-attribute resolution: active Global attributes apply broadly; Local mappings are preferred; unmapped Local values are exposed only when an enabled product in the enabled category/descendant scope actually uses the value.
- Managed `footer` and `bottom_footer` draft/publish menus with admin screens, RBAC/write gates, public ETag endpoints, cache invalidation, and storefront fallback data.
- Published Footer data: four groups and 26 links. Published Bottom Footer data: one `Trusted Partners` group and 19 links. Current seeded links use `#`.
- Category headings/document titles reject blank or shorter-than-five-character legacy SEO titles such as `0` and fall back to the category name. The category control bar retains sorting and removes its standalone search field.
- Exact storefront search for `PC` now applies a positive title-intent gate before pagination/facets: only names beginning `PC`, `Bộ PC`, or `Full bộ PC` survive. This removes `PCM`/`PCIe`/`PCE` prefix matches and mid-title accessory uses of PC without adding broad exclusions that would hide complete bundles containing monitors or Windows; other query, exclusion, and synonym behavior is unchanged.
- Desktop/mobile header mega-menu placement regression coverage.
- Shared offline GPL TinyMCE remains locally bundled and loaded only inside `RichTextEditor`; its menu/toolbar layout and promotion suppression were polished without moving it to the root layout or Tiny Cloud. Every current admin editor now exposes TinyMCE's native image file-picker button inside `Insert/Edit Image`; uploads use a scope-typed, RBAC-protected admin route, store randomized validated files below `MEDIA_ROOT/rich-text/<scope>/<ddMMyyyy>`, and return only durable `/api/media/...` URLs to the Source field without replacing alt/title/dimension values.
- Homepage Section 8 uses collection `896` / `goi-y-cho-ban` from the existing server bootstrap and remains server-rendered. Its ten carousel items now render the same shared `ProductGridCard` used by Section 11 and collection detail, including canonical square media, discount/market pricing, stock state, product navigation and the cart action; 280px desktop items retain the full card density and 180px mobile items use the existing compact container-query presentation. Its header exposes matching accessible previous/next arrow controls beside the collection link. The homepage-only raw JavaScript controller initializes every `.carousel-track` except the hero with a one-card buffer, optional clones, three-second auto-slide, mouse/touch drag, hover pause, indicators, resize recalculation, and a Next.js init/destroy adapter that prevents duplicate timers/listeners across route mounts. Track drag now suppresses only the click synthesized by an actual pointer movement so linked cards cannot navigate accidentally, while normal clicks and keyboard actions remain unchanged.
- Homepage Section 10 keeps its server-bootstrap category `137`, eight-product limit, CTA panel and existing carousel controller, but opts into the same `ProductGridCard` as Sections 8 and 11. Its direct carousel wrappers are 280px on desktop and preserve the prior two-card viewport formula through 768px; Section 6 and Section 17 deliberately retain the legacy card through the shared renderer's default variant. No browser product-section request or backend/API contract was added.
- Storefront collection detail is server-first: it shows the collection name as a visible H1 before the sanitized database `description`, then repeats the name in a gradient catalog H2 with the solid product count. It preserves safe description classes and inline styles, exposes only the two URL-driven price sort links, fixes page size at 24, and uses canonical Link pagination. Collection detail and homepage Sections 8, 10 and 11 now render the same `ProductGridCard` markup. The card uses a 260px CSS-container threshold to preserve the full presentation when space permits and automatically reduce density below it; narrow cards retain the stock dot and screen-reader label while hiding only the visible stock text.
- Homepage Section 11 category-feature sections now load at most nine distinct sellable products from each enabled category and all enabled descendants, ordered by `idv_sell_product_price.ordering DESC, product.id DESC`. At `xl`, each six-column block renders a three-column hero opposite three products, then six products below; smaller breakpoints use one/two/three columns with the hero first and full-width. The same configured payload fills the category page's existing `85/33` banner slot without appearing again in its product grid; category presentation hides the CTA while homepage keeps it. Category summaries require at least 10 sanitized plain-text characters or use the fixed stock/diversity/price/warranty fallback. Admin keeps the existing hidden category-page state, derives every target from the category route, accepts a two-line headline, mirrors hero copy opposite the selected box side, and stores the Section 11 container color in additive `container_background_color`.
- The admin collection editor exposes ordering as an integer-validated text input, presents the legacy `status` and `home_page` flags as Vietnamese `0/1` choices, and no longer exposes `icon_url`. Its four hierarchy/order/state controls use a responsive two-column grid, while the parent collection is selected through an accent-insensitive, keyboard-accessible searchable tree that excludes the current collection and descendants. Omitted icons default to the name on create and preserve the stored legacy value on edit. Both applications use the same inset-arrow contract for single-value native selects.
- Product-promotion create/edit modals opened from `/sales/product-promotions` now start exactly 80px below the viewport top to clear the fixed admin header, while standalone editing is unchanged. Their priority control is text-based but strictly accepts only `0`–`65535` integers (blank normalizes to `0`). Detail URLs are optional and remain validated as internal/HTTPS when supplied; an empty string is stored in the existing non-null column with no migration, and preview/admin/storefront omit the `Xem chi tiết` link for it.
- Product-detail `productPromotions` now merges two sources without another storefront request: active managed promotions remain first in their existing priority order, then each non-empty paragraph, list item or explicit line break from legacy `idv_sell_product_store.specialOffer` becomes a numbered `product-editor` item. Only sanitized rich-text fragments leave `web-admin`; safe TinyMCE text color/background, emphasis, decoration and alignment survive, while scripts, event handlers, unsafe CSS/URLs and embedded media/forms/tables are removed. Saving the product `combo` tab invalidates the catalog-detail cache.
- Article categories expose a strict `Nổi bật` 0/1 field in edit and an inline accessible list toggle. The state lives in additive `web_admin_article_category_meta`, is joined into admin category reads, and is created/updated/deleted transactionally without altering the imported news-category table or changing storefront behavior.
- Storefront news-category pages now use the core article layout from `font-end/danh-muc-tin-tuc.html`: three current-page articles form the 2/1/1 bento, the remaining page items form the 70% two-column list, and the 30% sidebar contains database-featured categories, four global most-viewed articles and the reusable unchanged red PC-build promotion. The featured-category and ranking panels are reusable presentation-only Server Components: `FeaturedNewsCategories` accepts `NewsCategory[]`, while `MostReadNews` accepts `NewsItem[]`; `CategorySidebar` only composes them and does not own their markup. The template's intermediate category-filter/sort strip is intentionally removed. On desktop only, the promotion sticks 110px below the viewport top; mobile keeps normal document flow. `GET /api/news-category/[slug]` still accepts `latest|popular` and canonical pagination retains a supplied sort, while share/copy is now the only client island.
- Storefront `/tin-tuc` now binds the checked-in `font-end/page-tin-tuc.html` structure to one server-side `GET /api/news/landing` payload: five configured active categories supply an 11-item 2/3/6 landing sequence, `Review Sản Phẩm` supplies the 2/4 review grid, and active category metadata supplies the reusable featured panel. The red promotion remains normal-flow on this route. A single client island presents up to six cached PCM channel-feed videos and mounts a privacy-enhanced YouTube iframe only after Play; feed failure retains the section without synthetic data.
- Storefront article detail now uses `font-end/single-bai-viet.html` with real article/category/sidebar data, Header/Footer, the reference 70/30 geometry and no synthetic copy. Its right sidebar directly composes `FeaturedNewsCategories`, `MostReadNews` and the same desktop-only `top: 110px` sticky `PcBuildPromotionBanner`; “Cùng danh mục” is absent. `GET /api/news/[slug]` preserves `data`, adds active `categories` plus four global `popularNews`, and returns at most six newest `relatedNews` from only the displayed breadcrumb category with no global fallback. Facebook/X/copy is the only article-detail client island.

The exact modified/untracked file list is intentionally not duplicated here because it changes during work. `git status --short` is authoritative.

## Accepted database state

- Active local database: `it_tech_db`.
- Retained legacy source: `hanoi23_db`; do not modify it during current work.
- Accepted schema: 292 physical tables, 164 InnoDB and 128 MyISAM, 1 routine, 2 triggers, zero Latin-1/utf8mb3 columns, and zero importer recovery/stage/restore tables.
- Catalog: 788 categories; 90 brands; 4,712 product/store/price/info/search rows; 14,455 product-category links; 17,603 product-attribute links; 162 category-attribute links.
- News: 8 categories (4 imported and 4 locally administered), 668 articles/content rows, and 705 unique article-category links. Source article 83 remains quarantined. Source IDs 682 and 683 were detected later but have not been imported.
- PCM is brand ID 96. Durable source maps include `0 -> 96`, `34 -> 25`, and `57 -> 31`. PCM owns 2,276 products, 849 enabled.
- The active catalog has one local test collection: ID `896`, slug `goi-y-cho-ban`, 27 linked products and 22 currently sellable products. It still has no approved combo-set, product-group, voucher, buying-guide, or modern product-image rows. One enabled managed product promotion currently applies to product 12767; the favorites table was created empty and may contain user-created rows later.
- `web_admin_category_feature_boxes.container_background_color` was added idempotently on `2026-07-16` after a restore-verified full logical backup. The migration ran twice against identified `it_tech_db`; `category_page_enabled` and `target_url` remain physically present for compatibility, while API responses derive their target from the category route.
- `web_admin_article_category_meta` was added idempotently on `2026-07-16` against identified `it_tech_db`; all eight current category IDs were backfilled with `is_featured=0` and the legacy category schema was not altered.
- Runs 2–8 are accepted and rollback-closed. Their in-database recovery tables were removed; recovery depends on protected external restore-verified artifacts.
- The last accepted post-favorites schema facts are documented in `web-admin/database-docs/DATABASE_SCHEMA.md`. Re-query the target before a write or migration; never use these counts as permission to mutate an unidentified database.

At the end of the `2026-07-15` audit, MySQL had stopped and readiness returned 503. It was restored by `2026-07-16`: ports 3000, 3001 and 3306 listen, `/api/health/ready` returns 200, database-backed integration tests pass, and healthcheck reaches 15/15 with the documented empty-catalog allowance. Do not enable `ADMIN_WRITE_ENABLED` merely to recover readiness.

## Implemented product surface

- Dynamic homepage, product/category/brand/collection/search/news/cart/checkout/account/favorites pages.
- Server-authoritative cart quote and order creation with origin/body/rate/CAPTCHA/idempotency controls, transactional voucher/order/customer/outbox writes, and safe error envelopes.
- Customer registration, verification, login/logout, reset/change password, sessions, addresses, order history, and favorites.
- Product detail supports sanitized descriptions/specifications, product groups, videos, vouchers, promotions, buying guides, recommendations, related news, responsive specification height, description/summary disclosure, and cached-image hydration recovery.
- Public list/search/category paths show enabled products; direct inactive product detail remains addressable with inactive state, while inactive categories return 404.
- Admin auth/RBAC/audit plus product/category/article/attribute/menu/banner/collection/group/combo/promotion/voucher/customer/order/user/role surfaces. Some older screens still need route-by-route API/validation/UX parity review.
- Bounded public reads, ETags, worker-local caches, database cache versions, signed search webhook, internal metrics, health endpoints, validated media upload, and background outbox/expiry processing.

## Verification performed on the current working tree

On `2026-07-16`:

| Check | Current result |
|---|---|
| `web-admin` TypeScript / ESLint / production build | Pass |
| `web-admin` unit tests | 144/144 pass, including strict PC search intent, rich-text product-promotion splitting/sanitization/ordering, canonical page-view validation, optional product-promotion links and strict priority validation |
| `web-admin` integration tests | 17 pass, 7 correctly skipped by fixture/safety gates; the public product-detail projection appends editor promotions after managed promotions without exposing raw `specialOffer` |
| `font-end` TypeScript / ESLint / production build | Pass |
| Focused product-promotion Playwright | Pass: 2/2 desktop/mobile checks. Product 12767 renders managed item 1, editor items 2–3, preserved strong formatting, no horizontal overflow and no serious/critical Axe violations. |
| Focused Section 8 carousel Playwright | Pass: 9 runnable desktop/mobile checks; 5 expected project-specific skips. Shared Section 8/11 card structure, cart keyboard activation, 280px/180px sizing, square media, four explicit overflow breakpoints, drag-without-navigation, autoplay, controls and lifecycle cleanup pass. |
| Focused Section 10 carousel Playwright | Pass: 4 runnable desktop/mobile checks; 2 expected project-specific skips. Shared Section 10/11 structure, cart keyboard activation, 280px/two-card responsive sizing, square media, four explicit overflow breakpoints, accessibility and drag-without-navigation pass. |
| npm audit, both applications | 0 known vulnerabilities |
| Runtime health, strict mode | 13/15; both configured legacy collection probes return 404, while the homepage and Section 8 production smoke pass |
| Runtime health with `LOCAL_HEALTHCHECK_EMPTY_CATALOG=true` | 15/15 while MySQL was available |
| Focused page-view Playwright coverage, one worker | Pass: both applicable desktop cases; two mobile-project duplicates are intentionally skipped. Four tracked routes emit one UUID each, refresh emits a new UUID, and static/404 routes emit none. |
| Full Playwright run, 4 workers | Pass: 107 passed and 19 expected project/device/data skips across all 126 desktop/mobile cases; the earlier 12-worker resource-exhausted run is historical only |
| Regression JS budget | Fail for product 236.8 KB, cart 175.5 KB, checkout 190.8 KB, combo-checkout 187.4 KB; combo-cart passes at 167.7 KB |
| Strict release JS budget | Fail for product, cart, checkout, and combo-checkout; combo-cart passes |
| Full 1,500-VU k6 release gate | Not run on a production-like host |

The controlled full Playwright suite is green. Keep the current regression/release bundle-budget failures separate: browser correctness does not make those performance gates pass.

## Environment and safety gates

- Secrets are ignored and must be transferred separately through an approved secure channel. Never commit `.env`, database archives, OTPs, hashes, tokens, credentials, or customer data.
- `web-admin/.env` or process environment must identify `it_tech_db`; start with `ADMIN_WRITE_ENABLED=false`.
- `font-end` needs `NEXT_PUBLIC_API_URL` and server-only `API_INTERNAL_URL`; it must not receive `DATABASE_URL`.
- Local CAPTCHA bypass is development-only and must be false in production.
- Production requires real CAPTCHA, SMTP, exact origins, webhook/metrics secrets, secure cookie/proxy settings, media storage, and bounded database pool configuration.
- Migrations/import applies/rollback/admin writes require `ADMIN_WRITE_ENABLED=true` plus operation-specific database/hash/confirmation guards. Return it to false immediately after an approved operation.
- Never run destructive importer or attribute CRUD tests against `it_tech_db` or `hanoi23_db`.

## Highest-priority next work

1. Preserve the dirty working tree and ignored database artifacts before changing machines; execute `NEW_MACHINE_SETUP.md` and restore-verify the destination database.
2. Keep MySQL readiness monitored; the current local runtime is restored at `/api/health/ready=200` and empty-catalog health is 15/15.
3. Fix the current frontend JS regression/release budget failures and rerun the budget scripts after a clean production build.
4. Keep full Playwright runs at controlled concurrency and triage only failures reproducible outside resource exhaustion.
5. Import missing variant/config-group/comboset definitions only after complete validated source exports exist.
6. Run read/commerce/abuse k6 scenarios on an approved production-like staging host and retain application/MySQL/host evidence.
7. Complete legacy admin write-route schema, RBAC, accessibility, and error-envelope audits.

## Required verification commands

Use the exact command blocks in `AGENTS.md`. When both applications and MySQL are healthy, also run:

```powershell
cd D:\web-tech\web-admin
npm.cmd run local:healthcheck
$env:LOCAL_HEALTHCHECK_EMPTY_CATALOG='true'
npm.cmd run local:healthcheck
Remove-Item Env:LOCAL_HEALTHCHECK_EMPTY_CATALOG
```

Use k6 only against an approved isolated staging host. Local checks are regression evidence, not a production-capacity claim.
