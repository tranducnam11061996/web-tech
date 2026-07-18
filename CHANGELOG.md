# Changelog

## 2026-07-18 — PC Builder implementation

- Added additive PC Builder component/profile/metric/rule/policy/build tables and the `pc_builder` order metadata contract to the guarded admin migration.
- Added deterministic extraction proposals, source hashes, admin review transactions/audit, stale-on-product-change behavior and cache-version invalidation.
- Added verified-only candidate, quote, guest share, account build CRUD, bounded Gaming auto-build and hardened PC Builder order APIs.
- Added `/xay-dung-cau-hinh-pc`, `/pc-builder` redirect and `/thanh-toan-pc-builder`, plus PC Builder RBAC/dashboard and unit coverage.
- No live schema migration or extraction was performed in this change.

Notable workspace changes are grouped by implementation/audit date.

Historical entries describe the state on their own date. Use `AI_HANDOFF.md` and `PROJECT_PROGRESS.md`, not an older “Known Gaps” section, for current status.

## 2026-07-17

### Homepage Section 11 shared mobile autoplay

- Opted every populated Section 11 product track into the existing homepage carousel controller only below 640px, retaining one server-rendered DOM, the shared `ProductGridCard`, the ~1.8-card composition and native snap scrolling as the no-JavaScript/reduced-motion fallback.
- Reused the existing one-card buffer, 400ms transform/reset, three-second interval, 20% drag threshold and movement-only click suppression for a seamless loop without cloning the nine-card Section 11 list or adding React state.
- Added viewport, document-visibility, focus, hover and drag pause conditions to the shared runtime. Media-query changes reinitialize idempotently, and crossing 640px restores child order, data attributes, overflow, touch-action and inline transforms before the Section 11 grid returns.
- Focused Section 11/8/10 Playwright passes 20 runnable checks with 14 expected project skips, including exact 397px geometry, autoplay/offscreen/focus behavior, real touch input, reduced-motion fallback, the 360/390/428/639/640 matrix and init/destroy regression. Both applications pass TypeScript, quiet lint and production build; admin unit tests pass 144/144 and integration passes 17 with 7 expected safety skips.

### Homepage Section 11 mobile carousel layout

- Reorganized each Section 11 block below 640px into one compact hero row, one category-title/action row and one native horizontal product carousel without duplicating hero or product-card DOM. The outer configured frame loses its mobile border, radius, shadow and padding, while tablet/desktop retain the existing two/three/six-column presentation.
- Added a homepage-only compact variant to the shared category hero: mobile height is 130px, headline/subheading shrink to 28px/10px and the hero CTA is hidden until `sm`. Category-page uses keep the default variant unchanged, including their CTA suppression contract.
- Preserved the canonical `ProductGridCard` unchanged inside responsive slide wrappers. At the supplied 397px reference, slides are about 195px wide with 16px gaps and the next card remains partially visible; native touch scrolling, snap points and local overflow do not join the scripted `.carousel-track` runtime.
- Focused homepage/category/shared-card Playwright passes 10 runnable cases with 8 expected project skips, covering exact 397px geometry, the 360/390/428/639/640 matrix, native scroll, links/focus, WCAG serious/critical results, desktop hero placement and category-page isolation. Both applications pass TypeScript, quiet lint and production build; admin unit tests pass 144/144 and integration passes 17 with 7 expected safety skips. Local health remains the documented 13/15 because both configured legacy collection probes return 404.

### Responsive Homepage Section 5 recreation

- Replaced Section 5's shared-class placeholders with a self-contained Server Component backed by five local AVIF category artworks, canonical storefront routes, `next/image` and one native `Link` per card; no global CSS, client state, API or database contract changed.
- Matched the supplied 2545px desktop reference with a centered 1800px three-column grid, 30px gaps and the Pre-built card spanning both rows. The 428px mobile reference uses two 16:9 cards above the asymmetric Pre-built/Upgrade/Monitor composition, with tablet widths retaining the two-column span layout.
- Added reduced-motion-safe transform/opacity interactions, equivalent hover and keyboard-focus treatment, meaningful image alternatives and focused Playwright coverage for exact reference geometry, intermediate breakpoints, images, routes, overflow and WCAG serious/critical violations.
- Verification passed storefront TypeScript, quiet lint, production build and all three focused Section 5 cases. The required admin TypeScript, quiet lint, 144/144 unit tests, integration suite at 17 pass/7 expected safety skips and production build also passed. Local health remained the documented 13/15 because both configured legacy collection probes return 404.

### Responsive Homepage Section 9 recreation

- Replaced the shared-class faux promotional artwork with five local AVIF category cards rendered by a self-contained Server Component using `next/image` and canonical storefront search links; no global CSS, client state, API or database contract changed.
- Matched the supplied 2537px desktop reference with a centered 1800px five-card 5:6 grid and 30px gaps, and the 429px mobile reference with two 3:2 cards above three 25:23 cards. Tablet widths use three columns, while focus-visible and reduced-motion behavior remain accessible.
- Added focused Playwright coverage for the two exact reference geometries, the 360/768/1024/1499/1500 transition matrix, image loading, links, keyboard focus, overflow and WCAG A/AA serious/critical violations. Storefront TypeScript, quiet lint, production build and all three focused cases pass.

## 2026-07-16

### Storefront brand-name cleanup

- Standardized every remaining checked-in storefront `Evetech`/`evetech`/`EVETECH` display string to the canonical `TrucTiepGAME` brand across the header, footer, promotional copy, contact text, static reference markup, and public sample content without changing CSS or layout structure.
- Recorded `TrucTiepGAME` as the exact public brand name in the canonical handoff so future UI and metadata work does not reintroduce the legacy template name.

### Exact PC search intent

- Added a positive title-intent gate for only the exact normalized `PC` query. Results must begin with `PC`, `Bộ PC`, or `Full bộ PC`, preventing Fuse short-token matches through `PCM`, `PCIe`, and `PCE` and rejecting accessory names such as `RAM PC` or `Case ... PC`.
- Preserved complete PC bundles that mention included monitors or Windows, left all other queries and synonym groups unchanged, and avoided broad component exclusions that would remove valid configured PCs.
- Added deterministic unit coverage for valid PC title forms, the reported false-positive classes, exact-query isolation, synonym behavior, and explicit exclusion opt-outs. The live ranking regression now traverses every PC result page under default, price, and newest ordering without hardcoding the catalog total; missing printer fixtures are reported rather than failing unrelated catalog checks.
- Local API verification reduced `q=PC` from 641 to 580 products and from 27 to 25 pages; an out-of-range page 27 clamps to page 25 with zero invalid product names. No schema, search-data rebuild, API-shape, or storefront change was required.
- Verification passed both applications' TypeScript, quiet lint and production builds, 144/144 backend unit tests, database integration at 17 pass/7 expected safety skips, the live ranking regression, focused storefront browser smoke, strict health at the documented 13/15, and empty-catalog health at 15/15.

### Product editor promotions on storefront detail

- Added a server-only DOM parser and strict rich-text allowlist for legacy product `specialOffer`; paragraphs, explicit breaks and list items now become individual promotion rows while safe TinyMCE color, emphasis, decoration and alignment remain intact.
- Extended the existing product-detail `productPromotions` payload with `managed` / `product-editor` source metadata, sanitized optional HTML and stable editor IDs. Managed promotions always retain the first positions and editor rows continue the same numbering without another storefront request.
- Updated the storefront promotion renderer to use valid block markup, bounded rich HTML and responsive overflow handling; raw editor HTML is never exposed, and unsafe scripts, handlers, CSS, URLs and embedded content are discarded.
- Added product-combo cache invalidation plus unit, read-only integration and desktop/mobile Playwright coverage for splitting, sanitization, ordering, rich formatting, overflow and accessibility.
- Verification passed both applications' TypeScript, quiet lint and production builds, 140/140 backend unit tests, database integration at 17 pass/7 expected safety skips, focused product-promotion Playwright at 2/2, and local health in documented empty-catalog mode at 15/15.

### Product-promotion form and optional detail links

- Offset create/edit promotion modals opened from `/sales/product-promotions` exactly 80px below the viewport top so the fixed admin header cannot cover their content; standalone editing remains unchanged.
- Replaced the priority number input with a text/numeric-keyboard control. Blank input normalizes to `0`; client and server now reject non-integer, negative and over-`65535` values consistently.
- Made `detailUrl` optional without a schema migration: empty values remain `''` in the existing non-null column, while supplied values retain internal/HTTPS validation. Admin preview/list and storefront product promotions omit the `Xem chi tiết` anchor when it is empty.
- Added unit and integration coverage for optional links and priority boundaries.

### Homepage Section 10 shared product cards

- Added an opt-in card variant to the shared Section 6/10/17 renderer and enabled it only for Section 10, replacing its duplicated legacy cards with the canonical `ProductGridCard` used by Sections 8 and 11.
- Preserved category `137`, the eight-product server-bootstrap payload, CTA/background, empty-section behavior and the existing autoplay/drag/resize carousel controller without changing backend, database or API contracts.
- Added direct 280px desktop wrappers and retained the prior two-card viewport formula through 768px; square media, discount/market pricing, stock state, product links and cart actions now come from the shared card and its existing container queries.
- Added focused desktop/mobile coverage for shared structural hooks, keyboard cart activation, square media, responsive widths and overflow, accessibility, SSR-only product-section data and drag without accidental navigation. Section 6 and Section 17 remain on the legacy renderer path.
- Verification passed both applications' TypeScript, quiet lint and production builds, all 135 backend unit tests, database integration at 16 pass/7 expected safety skips, focused Section 10 Playwright at 4 pass/2 expected project skips, and production-build local health in the documented empty-catalog mode at 15/15.

### Homepage Section 8 shared product cards

- Replaced Section 8's duplicated carousel-card markup with the same `ProductGridCard` used by Homepage Section 11 and collection detail, while retaining the server bootstrap, configured collection/order/limit and empty-section behavior.
- Added direct carousel item wrappers at 280px on desktop and 180px at mobile widths so the existing 260px card container query selects the full or compact density without changing the shared card API.
- Preserved the existing header, collection link, previous/next controls, autoplay, hover pause, drag/swipe, resize and init/destroy controller behavior without adding a browser collection request or changing backend contracts. The controller now suppresses only the synthetic click produced after real pointer movement, preventing linked shared cards from navigating during drag while leaving click and keyboard activation intact.
- Added focused desktop/mobile coverage for shared DOM hooks, canonical product navigation, keyboard cart interaction, square media, responsive sizing/overflow, accessibility and the existing carousel lifecycle.
- Verification passed both applications' TypeScript, quiet lint and production builds, all 135 backend unit tests, database integration at 16 pass/7 expected safety skips, focused Section 8 Playwright at 9 pass/5 expected project skips, and production-build local health in the documented empty-catalog mode at 15/15.

### Durable page-view tracking

- Added same-origin, rate-limited `POST /api/page-views` tracking for product detail, product category, news article, and news category pages. Cached GETs, metadata and prefetches remain read-only.
- Added idempotent InnoDB event storage plus background-worker aggregation into canonical `BIGINT` totals; public `visit` fields and popular-news ordering now read the canonical totals without mutating legacy content rows.
- Applied the additive migration twice after a 290-table/84,299-row restore-verified backup. The live schema now has 292 tables and 6,176 backfilled page-view totals; legacy visit sums remained unchanged.
- Added resolver, UUID, origin/referrer, worker transaction, integration, browser tracker and staging k6 coverage.
- Final verification passed both applications' TypeScript, quiet lint and production builds, 135/135 unit tests, database integration at 16 pass/7 expected safety skips, focused tracker Playwright, the full four-worker browser suite at 107 pass/19 expected skips across 126 cases, strict health 13/15 and documented empty-catalog health 15/15. The 150-RPS and 1,500-VU production-like staging gates remain pending.

### Storefront news landing template

- Rebuilt `/tin-tuc` from `font-end/page-tin-tuc.html` while retaining Header/Footer, internal Tailwind, dark theme and the original responsive class contract. Real public data now fills the fixed two-card hero, three-card row and six subsequent news rows without duplication.
- Added cacheable `GET /api/news/landing`, which resolves six active category slugs, deduplicates primary/junction membership, returns 11 newest landing articles plus six newest Review Sản Phẩm articles, active category metadata, and a safe PCM channel-feed payload without changing database schema.
- Reused `FeaturedNewsCategories` and `PcBuildPromotionBanner` in the 70/30 block; the landing promotion remains normal-flow at every breakpoint. Empty category groups render no sample cards.
- Added a focused PCM Official client island backed by the bounded 15-minute YouTube Atom feed. It validates the fixed channel/video identity, omits unavailable duration labels, switches playlist entries accessibly, and mounts a `youtube-nocookie.com` iframe only after Play. Feed outages retain an explicit section-level error state.
- Added parser/category-scope unit tests, live database landing integration coverage and desktop/mobile Playwright coverage for 2/3/6 binding, review mapping, sidebar geometry, non-sticky promotion, playlist keyboard behavior and horizontal overflow.
- Verification passed both applications' TypeScript, quiet lint and production builds, 131/131 backend unit tests, the database suite at 14 pass/7 expected skips, focused landing Playwright at 4/4 and the full four-worker suite at 105 pass/17 expected skips across 122 cases. Strict health remains the documented 13/15 and empty-catalog mode passes 15/15.

### Storefront news-category template

- Rebuilt `/tin-tuc/[category-slug]` from the checked-in reference markup in `font-end/danh-muc-tin-tuc.html` while retaining the existing Header/Footer, compiled Tailwind setup, dark theme, spacing and responsive breakpoints. Each page uses its first three API articles in the 2/1/1 bento and renders at most 18 non-duplicated cards below in the original 70/30 content/sidebar layout.
- Extended `GET /api/news-category/[slug]` with strict `latest|popular` sorting, the shared active-category navigation payload (`image`, `totalNews`, `isFeatured`) and four global most-viewed public articles. The legacy `data`, `news`, `totalNews` and `pagination` fields remain compatible, and `/api/news` now reuses the same safe category query.
- Bound real category/article titles, summaries, media, dates and visits into the existing markup; empty summaries remain empty, missing authors use `PCM`, broken/missing media retains the gradient surface, and empty categories keep the complete sidebar without synthetic cards. Out-of-range category pages return 404.
- Replaced the stale hardcoded news sidebar with featured categories from `web_admin_article_category_meta`, one shared `Newspaper` fallback icon, the global popular list and a reusable `PcBuildPromotionBanner` containing the unchanged red promotion markup.
- Extracted the featured-category panel into the presentation-only `FeaturedNewsCategories` Server Component and imported it back into `CategorySidebar`. It accepts `NewsCategory[]`, preserves the existing markup/classes, links and fallback icons, and can be reused without pulling in popular-news or promotion concerns.
- Extracted “Đọc nhiều nhất” into the presentation-only `MostReadNews` Server Component and imported it back into `CategorySidebar`. It accepts `NewsItem[]`, preserves the existing ranked links, view formatting and markup/classes, and can be reused without category or promotion dependencies.
- Removed the intermediate category-filter/sort strip completely from the news-category page. Direct `sort=latest|popular` URLs remain API-compatible and canonical pagination still preserves `sort`, but Facebook/copy is now the only client island.
- Made the shared `PcBuildPromotionBanner` sticky only on desktop with an exact `top: 110px` header clearance; mobile retains its original normal-flow position. Focused desktop/mobile smoke verifies the removed controls, computed sticky position/top and live scrolled offset.
- Verification passed both applications' TypeScript, quiet lint and production builds, 126/126 backend unit tests, the database integration suite at 11 pass/7 expected skips, focused category-template Playwright at 5 pass/1 expected project skip, and the full four-worker storefront suite at 94 pass/16 expected skips across 110 cases. Empty-catalog health passed 15/15; strict mode retains the known two legacy collection-fixture 404s.

### Storefront news-article template

- Rebuilt `/tin-tuc/[article-slug]` from `font-end/single-bai-viet.html`, retaining Header/Footer, compiled Tailwind, dark presentation and the original 70/30 responsive geometry while binding only real article metadata, summary, thumbnail, sanitized content, tags and view count.
- Extended `GET /api/news/[slug]` without removing `data`: it now adds active category navigation and four global most-viewed articles. `data.relatedNews` is the newest six articles in the displayed breadcrumb category, deduplicated across primary/junction membership, excludes the current article and has no global fallback.
- Removed “Cùng danh mục” and imported `FeaturedNewsCategories`, `MostReadNews` and `PcBuildPromotionBanner` directly into the right sidebar. The promotion retains desktop `top: 110px` sticky behavior and mobile normal flow.
- Added an article-only accessible Facebook/X/copy client island; the rest remains server-rendered. Empty tags hide the tags group, missing authors use `PCM`, missing media keeps the template gradient, and related cards use real URLs, thumbnails and timestamps.
- Focused combined news coverage passes 12 runnable cases with two expected device skips. The full controlled storefront run passes 101 cases with 17 expected skips across 118 desktop/mobile cases.

### Article-category featured state

- Added the `Nổi bật` 0/1 field to article-category create/edit and a keyboard-accessible `Nổi bật`/`Không` toggle on the category list.
- Added RBAC-protected `PATCH /api/admin/article-categories/[id]/featured`; the focused update locks the category and changes only featured metadata, avoiding stale full-form overwrites.
- Added and applied the additive `web_admin_article_category_meta` table on identified `it_tech_db`, backfilling all eight current categories with `0` while leaving the imported `idv_seller_news_category` contract unchanged.
- Category create/update/delete now reconciles metadata in the same transaction. Strict validation rejects values outside `0|1`; unit and rollback-based database integration coverage pass.
- Verification passed both applications' TypeScript, quiet lint and production build, 123/123 backend unit tests, 9 integration checks with 7 expected safety/fixture skips, and an unauthenticated focused-toggle probe returned the safe expected `401`. Strict local health remains the documented 13/15 because only the two legacy collection probes return 404.

### Offline TinyMCE image picker

- Enabled TinyMCE's native image-only file picker inside `Insert/Edit Image` across every shared admin editor while retaining the existing offline `/tinymce.min.js` loader, dark skin, menubar, toolbar order, external upload controls and wrapper styling.
- Added `POST /api/admin/editor-images/[scope]/upload` with explicit product/category/collection/article RBAC mapping, the existing admin write/origin/session/audit gates, a 10 MB limit, MIME/extension/signature agreement, randomized filenames and containment below `MEDIA_ROOT/rich-text/<scope>/<ddMMyyyy>`.
- Upload success fills only the dialog Source with a durable `/api/media/...` URL; alt text, image title and dimensions remain under the existing dialog's control. Validation, authorization and transport failures appear through TinyMCE notifications and never insert Base64/blob content.
- Verification passed both applications' typecheck, quiet lint and production build, 121/121 backend unit tests, 7 integration checks with 7 safety/fixture skips, and a same-origin headless smoke against the bundled offline TinyMCE that found exactly one keyboard-focusable `Browse files` button and the retained dark dialog background.

### Storefront collection detail

- Rebuilt `/collection/[slug]` around server-rendered collection data: sanitized `idv_category_special.description` HTML now appears before the catalog and retains safe database-authored classes and inline styles, while active content and unsafe URLs remain stripped.
- Made the collection name a visible responsive H1 before the database description. The catalog heading now reads `Tên bộ sưu tập (N sản phẩm)`, applies the existing white/cyan/purple gradient only to the name, keeps the count solid, wraps long names safely and supplies a forced-colors fallback.
- Removed the decorative collection hero, price-range controls, apply action and sort select. The catalog now exposes direct `Giá từ Thấp - Cao` and `Giá từ Cao - Thấp` links, resets sorting to canonical page one, and keeps default collection ordering when neither is selected.
- Fixed the internal page size at 24 and replaced client-managed pagination with canonical Next.js links that retain sort, omit `page=1`, expose current-page semantics and hide on one-page collections.
- Unified collection detail and homepage Section 11 on one `ProductGridCard` DOM and style contract, removing the collection-only compact render branch while retaining the responsive six/four/three/two-column collection grid.
- Added card-level CSS container behavior at 260px: wide cards retain the complete Section 11 presentation, while narrow cards reduce spacing and controls, keep the green stock dot, and expose `Sẵn hàng` through a visually hidden label. Market and sale prices now remain 1-3px apart without clipping across all collection breakpoints.
- Added desktop/mobile Playwright coverage for description ordering and sanitization, dark-theme preservation, responsive columns and overflow, URL-driven price ordering, browser history, accessibility and pagination helpers.
- Kept the existing no-article product thumbnail at true full width during initial loading by disabling only its transient scale effect; it remains a direct `<img>` and the disclosure/sticky layout is unchanged.
- Verification passed both applications' typecheck, quiet lint and production build, 117/117 backend unit tests, 7 integration checks with 7 safety/fixture skips, and the controlled four-worker storefront suite at 88 pass/14 expected skips across 102 cases. Strict health remains 13/15 for the two configured legacy collection 404 probes; empty-catalog mode passes 15/15.

### Collection editor and native select controls

- Simplified the admin collection form by removing the editable legacy `icon_url` field, converting ordering to an integer-validated text input, and relabeling the stored `0/1` status and homepage flags as `Ẩn`/`Hiển thị` and `Không`/`Có`.
- Reorganized the parent, ordering, visibility, and homepage controls into a responsive two-by-two grid and relabeled the homepage flag as `Hiện thị tại Homepage`.
- Replaced the parent collection native select with a local searchable tree that filters Vietnamese text without accents or by numeric ID, preserves hierarchy, supports pointer and full keyboard selection, and excludes the current collection plus descendants before the backend cycle guard.
- Collection updates now preserve an existing legacy icon when the client omits it, while new collections continue to default that value to the final collection name and explicit API clients remain compatible.
- Standardized the inset SVG arrow and right-side text clearance for every single-value native select in both applications; multiple selects retain their browser-native presentation.
- Verification passed both applications' typecheck, quiet lint and production build, 117/117 backend unit tests, 7 integration checks with 7 safety-gated skips, the controlled four-worker Playwright suite at 83 pass/11 expected skips, computed-style/keyboard select smoke in both applications, and the documented 15/15 empty-catalog health mode. Strict health remains 13/15 only for the two expected legacy collection 404 probes.

### Homepage category-feature sections

- Bound the same configured feature-box payload into the category page's existing `85/33` banner slot. Category routes request the new read-only `configured` scope, which reuses a box enabled for either homepage or the legacy category-page flag without mutating that stored flag; the product grid receives no feature box, preventing duplicate rendering.
- Added a category-only `showCta=false` presentation mode so the banner omits `Xem ngay` while homepage feature heroes retain their CTA. Category summary rendering now uses sanitized plain text only when it contains at least 10 characters; otherwise it displays `Sẵn kho - Đa dạng - Giá tốt - Bảo hành chính hãng` and no longer substitutes `meta_description`.
- Simplified each storefront section header to the category name only, localized its collection link to `Xem tất cả`, removed the decorative hero rule, and increased hero subheading/headline/CTA typography to a clearer responsive display hierarchy based on the supplied PC Deals reference.
- Extended `web_admin_category_feature_boxes` with idempotent `container_background_color varchar(16) NOT NULL DEFAULT '#0f0f14'`; the identified `it_tech_db` migration ran twice after a full restore-verified logical backup, without removing the existing category-page or target columns.
- Removed the visible category-page and target-URL controls from category administration while preserving the former state in payloads. All admin/public read paths now derive the link from the category `request_path`, falling back to its legacy `url`, and ignore client target overrides.
- Added two-line headline validation and editing, a live container-color picker, mirrored copy placement opposite the hero side, and a six-column preview with a half-width hero plus three product placeholders.
- Changed homepage category-feature loading to include enabled descendants, deduplicate memberships, return at most nine sellable products, and order by `idv_sell_product_price.ordering DESC, product.id DESC`.
- Rebuilt Section 11 responsively: desktop uses a half-row hero opposite three cards and six cards below; mobile/tablet place the full-width hero before one/two/three-column product grids. The subheading now precedes the headline, manual headline breaks are retained, and the configured container color is applied safely.
- Added normalization/unit coverage, a live-database read-only ordering/scope integration test, and desktop/mobile Playwright assertions for card count, geometry, content order, color, new-tab target, mirrored placement, and horizontal overflow.
- Final verification passed both applications' typecheck, quiet lint and production build, 111/111 backend unit tests, the default database suite at 7 pass/7 safety- or fixture-gated skips, and both focused homepage/category-page feature Playwright suites at 2 pass/2 expected device-project skips each. Strict local health remains 13/15 only because the two configured legacy collection probes return 404; documented empty-catalog mode passes 15/15.

### Homepage Section 8 carousel controls

- Added a matching next-arrow button beside the existing previous-arrow control and `Xem tất cả` link, completing the Section 8 previous/next pair without adding client state or another controller.
- Added Vietnamese accessible names and explicit button types for both icon-only controls.
- Extended the focused Playwright coverage to verify that previous wraps from product 1 to product 10 and next returns to product 1.
- Verification passed both applications' typecheck, lint and production build, all 107 backend unit tests, the default integration suite at 6 pass/7 safety-gated skips, and the full focused carousel suite at 7 pass/3 expected project skips.

## 2026-07-15

### Homepage featured collection

- Replaced Section 8's ten static demonstration cards with up to ten sellable products from configurable collection `896` / `goi-y-cho-ban`, while preserving the existing section/carousel/card wrappers and CSS classes.
- Added a bounded lean featured-collection payload to the existing homepage bootstrap so the storefront keeps one server-side homepage request instead of issuing a separate or client-side collection fetch.
- Added collection-aware bootstrap cache keys and public-product cache invalidation after collection metadata, membership, or ordering mutations.
- Removed the static specification/promotion badges; real card badges render only when supplied by the API.
- Removed the Section 8-specific React carousel controller and returned Section 8 to server-rendered collection markup without changing its wrappers, classes, IDs, card structure or CSS.
- Ported the raw carousel algorithm from `font-end/index.html` into a dedicated homepage script: every non-hero `.carousel-track` now uses the reference one-card buffer, conditional clones, 400 ms transform/reset, three-second timer, mouse/touch threshold gestures, hover pause, indicators and resize recalculation.
- Added a nonvisual Next.js script adapter with explicit init/destroy lifecycle cleanup so client-side route remounts cannot accumulate cloned cards, timers, listeners or inline transform state. The broader dormant `public/main.js` remains unloaded.
- Replaced the obsolete Section 8 isolation/reduced-motion tests with desktop/mobile coverage for global initialization, reference timing, frame-level reset continuity, hover pause, mouse/touch thresholds, geometry/request preservation and idempotent clone cleanup.
- Verification passed both application typecheck/lint/build pipelines, 107/107 backend unit tests, the default integration suite at 6 pass/7 safety-gated skips, and the replacement homepage-carousel suite at 7 pass/3 expected project skips across desktop/mobile. Strict local health remains 13/15 only because the two configured legacy collection probes return 404; documented empty-catalog mode passes 15/15 and the production storefront/homepage carousel smoke passes.

### Whole-workspace documentation and continuation audit

- Re-audited Git state, application boundaries, route/config inventory, database runbooks, environment usage, runtime health, security audit, browser coverage, and frontend JavaScript budgets.
- Replaced the stale/duplicated canonical handoff with a concise current-state `AI_HANDOFF.md`, added `NEW_MACHINE_SETUP.md`, and recorded detailed evidence in `PROJECT_AUDIT_2026-07-15.md`.
- Corrected current repository HEAD, the post-favorites 289-table database state, accepted external recovery boundary, strict 13/15 versus empty-catalog 15/15 health behavior, and current verification counts across root/app/database documentation.
- Recorded that the current dirty working tree and ignored database/media/secrets require separate transfer; a Git clone alone cannot reproduce the active source-machine state.
- Recorded current frontend budget failures and classified the 12-worker full Playwright run as resource-inconclusive; the focused new specs pass with controlled single-worker execution.
- Did not modify application code, database schema, or database data during this documentation audit.

### Expanded offline TinyMCE controls

- Enabled the standard `File`, `Edit`, `View`, `Insert`, `Format`, `Tools`, `Table`, and `Help` menubar for the shared admin rich-text editor.
- Expanded the wrapping toolbar with text colors, links, images, media, tables, source code and fullscreen while retaining all existing formatting controls.
- Disabled TinyMCE's `Get all features` promotion through the supported configuration flag and collapsed the empty generated promotion container so the header no longer reserves that CTA area.
- Restored the editor header grid after hiding promotion by making the menubar and direct/wrapped toolbar span the full editor width; wide screens stay one row and narrow screens wrap horizontally instead of producing a right-hand toolbar column.
- Preserved the local `/tinymce.min.js` GPL integration, bundled plugins, dark skin/content background, content synchronization and vertical-only resize behavior.

### Category SEO-title fallback

- Added a shared storefront title resolver: category `meta_title` is used only after trimming to at least five characters; legacy blanks and `0` now use the category name, with a final `Danh mục sản phẩm` fallback.
- Applied that resolver to the category catalog heading and `generateMetadata` only, so `/pc-ssd-512gb` now renders `PC SSD 512GB` in both locations while valid SEO titles remain unchanged.
- Removed the unused standalone catalog search control while preserving existing sort-query behavior and its layout/classes.

### Attribute value ApiKeys

- Backfilled all 426 `idv_attribute_value.api_key` rows in `it_tech_db` with canonical, collision-free lowercase slugs; `AMD Ryzen 7` is now `amd-ryzen-7` and no value remains blank.
- Made ApiKey required and editable in the existing attribute form, with shared Vietnamese slug generation, format/length/duplicate validation, transactional persistence and cache invalidation.
- Added `apiKey` to category/search facet values and switched storefront URL state plus category/search backend matching to the stored key. Changed keys take effect immediately; display-name slugs are not retained as aliases.
- Added a default-dry-run, write-gated backfill command with database/count/confirmation locks and post-apply verification.

### Category attribute filter recovery

- Added one shared public category-attribute resolver for sidebar metadata and product query filtering. Active searchable Global attributes and mapped Local attributes retain their existing behavior; an unmapped Local value is now eligible only when a sellable product in the enabled category scope actually uses it.
- Restored `PC SSD 512GB` (category 1106) from brand-only filtering to 9 attribute groups / 39 assigned values without backfilling `idv_attribute_category` or changing storefront markup/CSS.
- Added unit and read-only integration coverage for inferred, mapped, Global, inactive and unsafe values, plus live filter smokes for CPU, RAM, GPU and SSD.

### Attribute management CRUD

- Connected `/product/attribute-list` and `/product/attribute/edit` to the live legacy attribute schema without changing their existing layout or CSS.
- Added validated, RBAC/write-gated create/update, bulk status and cascading delete APIs. Attribute/value/category reconciliation is transactional and refreshes shared catalog/search caches.
- Added real list search, sorting, pagination selection, bulk actions, category counts, edit navigation, value management and category-tree assignment. Active/search/global attribute semantics are now applied consistently by public filters and product selectors.
- Added validation tests plus a destructive integration scenario that can run only against an explicitly named disposable database with its separate gate.

### Bottom Footer managed content

- Added a separately versioned `Bottom Footer` menu with the `/content/menu/bottom-footer` admin screen, RBAC/write-gated draft and publish APIs, public `GET /api/menu/bottom-footer`, ETag response support, and cache invalidation after publication.
- Seeded and published `Trusted Partners` to `it_tech_db` as one fixed group with 19 active desktop/mobile `#` links: Adata through Einarex in the existing Footer order.
- Bound only the existing Trusted Partners heading and 19 `partner-link` anchors to public data; no Footer elements, class names, or CSS rules were added, removed, or restyled.

## 2026-07-14

### Footer Menu managed content

- Added a separately versioned `Footer Menu` with the existing draft/publish workflow, the `/content/menu/footer` admin screen, RBAC/write-gated save and publish routes, audit trail, and public `GET /api/menu/footer` with ETag support.
- Seeded and published the four required groups (`Shop`, `Support`, `Info`, `Build`) with 26 active desktop/mobile links, all initially targeting `#`.
- Bound the existing Footer's four headings, icon, labels and hrefs to the public menu data without adding, removing, or restyling any Footer HTML/CSS elements.
- Verified the public API and storefront rewrite return the published 4-group/26-link payload (including a conditional `304`); both applications passed typecheck, ESLint, build, and the backend unit/integration suites.

### Admin local-development login recovery

- Scoped React/Turbopack's required `unsafe-eval` allowance to the non-production CSP only; production retains the existing strict script policy.
- Restored the explicit local reCAPTCHA development bypass, restarted the admin development server, and verified the admin login API returns `200` with the local-only empty-token path.
- Recovered the existing local superadmin account through an audited password reset, revoked prior sessions, and required a password change after the next successful sign-in. No credential is stored in source control.

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
