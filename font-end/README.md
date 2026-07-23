# HACOM Storefront

Last verified: `2026-07-24`

`font-end` is the customer-facing Next.js 16.2.11/React 19.2.4 storefront. It consumes `web-admin` APIs and must never access MySQL or backend secrets directly.

## Voucher scope presentation

Product-detail voucher discovery may now match the current product through a direct SKU relation, a selected category root/descendant, or the global empty-scope state. The public payload still omits configured SKU IDs. `ProductVoucherModal` presents the existing admin-authored voucher description and no longer infers a `Phạm vi` line from category names, preventing direct-SKU vouchers from being mislabeled as global. Cart and checkout continue to show apply/error state and discount amount without an inferred scope note.

## Shared news metadata and PC Build promotion

The article header, related-article cards, news-category list cards and all three first-row hero cards use the existing server-rendered `createDate` and `visit` values through the shared `NewsCardMeta` renderer. A semantic `dd/mm/yyyy` time and a Vietnamese-localized, non-negative view count replace the PCM author label, remain left-aligned beside each other with a 16px gap on the existing dark surfaces, and can wrap only when a narrow viewport requires it.

The shared news-sidebar PC Build banner displays `PC BUILD BỞI CHUYÊN GIA`. Its `PC VĂN PHÒNG` and `PC GAMING` offer cards intentionally link to `/pc-van-phong.html` with protected new-tab semantics, so news landing, category and article pages expose the same destination and keyboard focus treatment.

## Product-promotion emphasis

Product-detail promotions preserve their managed-first ordering. Plain promotions supplied by web-admin render their text in semantic `<strong>`, matching the bold formatting already preserved from safe editor HTML; an optional `Xem chi tiết` link remains outside that emphasis and retains its existing internal/external navigation semantics.

## Product-gallery control layering

The product-detail thumbnail rail uses an isolated local stacking context. Previous/Next arrows sit above ordinary thumbnails at layer `1`, while specification and video utility buttons sit at layer `2`. This preserves arrow scrolling but guarantees that a utility wins pointer hit-testing wherever the controls overlap; no page-wide z-index, pointer-event suppression, geometry or carousel-state change is involved.

## Product-detail Combo configurator

The product-detail add-on picker uses the canonical `ProductGridCard` instead of a modal-specific card. Inside the dialog, the card displays `comboUnitPrice` against the current sell price and replaces the ordinary cart action with an immediate add/remove-Combo control; it carries `aria-pressed`, does not write `hacom.cart.v1`, and leaves the default shared-card behavior unchanged elsewhere. Product image/title links open in protected new tabs.

The tech-premium dialog keeps its header, selected count, keyboard tab rail, search/meta toolbar and optional pagination outside the scrolling product area. Its grid uses two columns below 640px, then three/four/five/six columns at 640/1024/1280/1600px; sparse desktop groups are centered at the full 280px card density. The shared dialog hook owns body scroll lock, focus trap, Escape and focus restoration, while loading skeletons, retry and query-aware empty states cover asynchronous group loading. Public Combo APIs, quote and Combo Cart contracts are unchanged.

## Shared Brand and Collection detail layout

`/brand/[slug]` and `/collection/[slug]` use one server-rendered catalog-detail layout. Both render breadcrumb, sanitized editor HTML, product heading/count, two canonical price-sort links, the shared `ProductGridCard` grid and numeric pagination in the same order and with identical geometry. The grid is 2/3/4/6 columns at mobile/`sm`/`lg`/`xl`; page one is omitted from canonical links.

Collection always renders its H1. Brand renders its H1 only when sanitized editor `description` contains at least 10 readable characters or at least one image with a safe HTTPS, `/api/media` or relative `src`; an image-only TinyMCE banner therefore still shows the heading, while empty wrappers and short text do not. Brand retains its own metadata, 404/error text and empty-state copy. The former logo hero, price-range controls and simple previous/next pagination are no longer rendered. Brand editor media continues through the storefront `/api/media` proxy, and no browser-side Brand request or client state was added.

## Product-description static HTML

Product-detail CMS descriptions use a product-only DOM hook. At the `lg`/1024px breakpoint, a root image or the sole image branch of a direct paragraph—including one legacy `span` or link wrapper—is a centered block with `min-width: 60%`, `max-width: 100%`, automatic height and 20px vertical margins. Multiple-image paragraphs, the thumbnail/summary fallback, product-category static HTML and smaller viewports keep their existing behavior.

## Managed Header utilities

Desktop and mobile Header utility controls consume `utilityLinks` from `GET /api/menu/header` in published order. `systemKey` maps account to the existing `CustomerAccountMenu`, cart to the live badge, favorites to `/yeu-thich`, and assistant to a non-navigating button. `desktopVisible` and `mobileVisible` are applied independently. Missing API metadata falls back to the same four Vietnamese controls; an explicitly published empty list remains empty. Existing Header class geometry and `style.css` are unchanged.

## Shared responsive Footer

`Footer.tsx` is shared across the storefront. It consumes a dynamic group/link array from `GET /api/menu/footer` and a dynamically named partner list from `GET /api/menu/bottom-footer`; published labels, suffixes, URLs and order are rendered without seed cardinality checks. Groups with no links are hidden, an empty Footer list removes the nav, and an empty Bottom Footer list removes the partner rail without activating fallback data. Contact details, TrucTiepGAME copy, Vietnamese legal text, social controls and the local Bộ Công Thương/DMCA certification images remain source-owned.

Desktop centers the composition in an 1800px container with the intro beside a four-column wrapping menu grid, one contact/social/certification row, optional partner rail and legal/payment split. From `1280px`, the wider columns use a balanced 1–2px typography increase; below that breakpoint the existing mobile/tablet type scale is unchanged. Footer height follows its content and retains only the standard 64px bottom padding after the final line. Mobile uses 24px insets, a two-column wrapping menu grid, four stacked contact cards and same-row certifications. The newsletter email field accepts typing and browser autofill, while its submit button remains disabled with an accessible unavailable description until a backend exists. The partner track centers automatically when it fits and remains natively scrollable when it overflows.

## PC Builder storefront

The v6 storefront shows dynamic required-group progress, each SKU's conditional “Giá Build PC khi đủ bộ”, and an applied badge only when the server returns `buildPriceEligible=true`. All displayed/exported totals use the current quote. Removing a required group re-quotes every line back to catalog/Flash Sale pricing. Ordinary cart handoff still uses `cartPrice`; only direct PC Builder checkout retains the Build PC fingerprint and price.

The v5 storefront follows the dense reference layout while preserving TrucTiepGAME dark surfaces: category/product table on desktop, component cards on mobile, quantity stepper `1–4`, order summary below the table, and save → Excel → PNG → share → print actions. The introduction uses local responsive AVIF/WebP artwork and the FAQ uses six semantic `<details>` items. The candidate modal and catalog-live compatibility contract are unchanged.

“Thêm vào giỏ hàng” atomically merges all selected SKU quantities through `addCartItems` and emits one cart event. It intentionally uses `cartPrice`, so ordinary cart/Flash Sale pricing is re-applied and Build PC discounts are not retained. “Đặt hàng ngay” remains the dedicated promotion-aware PC Builder checkout. Excel uses a dynamically imported `xlsx` module; PNG draws a dark branded canvas without remote product images; print exposes only the print sheet and never changes the live page to a white theme.

The current storefront is Manual-only. It never falls back to a hard-coded component list: ordering, labels, required state and per-component SKU limits come from bootstrap, and bootstrap failure renders an explicit retry state. The full-screen/mobile candidate dialog consumes server-compatible pagination and price/brand/attribute facets. Single-select slots replace and close; multi-select slots such as SSD/HDD stay open and allow distinct SKUs up to the configured maximum.

Missing required slots are warnings, not compatibility errors. Before checkout the UI lists the missing display names and stores confirmation in `sessionStorage` keyed by quote fingerprint plus warning signature. Checkout re-quotes; any changed price/catalog/relation/config/warning invalidates that confirmation. Hard compatibility or availability errors remain blocking.

`/xay-dung-cau-hinh-pc` is canonical; `/pc-builder` redirects there. The browser persists only bounded selection component codes/IDs/quantities in `hacom:pc-builder:draft:v1`, and does not write until hydration completes. Historical `storage` selections are accepted only as migration input: the server quote resolves each one to `ssd` or `hdd`, the builder displays it in the canonical row and rewrites the draft. Quote totals, diagnostics and checkout actions are used only while their selection signature matches current state, so an aborted/delayed response cannot revive reset data. Candidates, prices, compatibility and revisions come from `web-admin` and are revalidated by `/thanh-toan-pc-builder`.

Guest share links are read-only and requoted on open. Account builds use the customer API. Checkout creates a separate PC Builder order with free assembly by default. Missing required components can be confirmed; category, availability and attribute-relation errors cannot.

Manual PC Builder is enabled against the live sellable catalog without profile verification. Candidate membership always includes the configured category root and every enabled descendant. Compatibility context is shown only for relations that pass the backend's shared 90% attribute-coverage gate, preventing sparse legacy attributes from hiding most valid SKUs. Gaming Auto remains future-phase data/code and is intentionally not represented in the storefront bundle; bootstrap exposes only Manual configuration.

## Combo storefront

Product detail renders active combo summaries returned by web-admin, chunks more than four combo groups into four-card slides, and uses the first sellable SKU thumbnail already embedded for each group. It lazy-loads group products and re-quotes on every selection/quantity change. The separate pages `/gio-hang-combo` and `/thanh-toan-combo` use `hacom.combo-cart.v1`; this storage contains IDs and quantities only and never acts as a trusted price source. Voucher state and the standard cart remain isolated.

The combo cart and checkout use the same dark commerce frame, Header, Footer, responsive card grid, form fields, payment cards, and footer spacing as `/gio-hang` and `/thanh-toan`. Their “Ưu đãi combo” card is display-only: it never reads or applies a voucher and the Header badge remains the standard-cart badge.

## Environment and commands

Required public variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
```

```powershell
npm.cmd run dev
npx.cmd tsc --noEmit
npm.cmd run lint -- --quiet
npm.cmd run build
npm.cmd run start
npm.cmd audit
```

The default port is 3001. Production routing should expose backend APIs through the approved origin/proxy contract.

The storefront CSP permits `unsafe-eval` only under `next dev`, because React's development diagnostics require it. Production builds keep `script-src` without `unsafe-eval`.

## Main journeys

- Product detail renders the API-provided Product Group only when at least two valid sellable SKUs include the current product. It shows four SKU cards per slide, uses each SKU's real thumbnail plus prices/slugs, and issues no extra group request.
- Product-detail gallery utilities are conditional: normalized YouTube videos open in a lazy modal that mounts only the active player, and meaningful API-provided specification HTML opens the existing technical-specification modal. Invalid legacy video data is omitted by `web-admin` and never becomes a browser iframe source.
- Product descriptions retain a visible bounded preview while collapsed and expose an accessible “Xem thêm” / “Thu gọn” control for the remaining article content.
- Product details without an article reuse the description disclosure/content structure with a product-name heading, a direct full-width centered thumbnail, and normalized `proSummary` rows below it without visual list markers; article products keep their rendered markup and both branches preserve the technical-specification height reference.
- On desktop, the technical-specification column compares its natural table height with the description's collapsed height: overflowing content clips to that exact height and keeps the modal action, while fitting content renders fully without an overlay/action. The preview keeps the collapsed reference while an independent outer boundary follows the description's current height, anchoring at `110px` until the description bottom; transient zero-size startup measurements retry without a scroll listener. Mobile keeps the existing `66vh` modal preview.
- Product-detail quick specifications show all non-empty `proSummary` rows when there are at most five. Longer summaries start with five rows and provide the accessible “Xem thêm thông số kỹ thuật” / “Thu gọn thông số” disclosure without changing the full specification modal.
- Homepage bootstrap, managed header/homepage content, banners, product sections, and category feature boxes.
- Homepage Section 2 consumes the managed `circleStory` payload already present in the server bootstrap, with `/api/menu/homepage` retained only as the server fallback. Each story uses a 3px gradient ring, a 3px dark spacer and artwork/fallback inset by 6px. At 397px its 73px rings advance on an 81px step and expose four complete stories plus most of a fifth; at 2542px fourteen 96px rings with 32px gaps center inside a 1920px rail. It avoids legacy `.story-*` CSS/IDs and opts into the shared mobile-only three-second autoplay/drag lifecycle while keeping native horizontal scrolling for no-JavaScript and reduced-motion users.
- Homepage Section 3 consumes the managed `slide_home` banner array already present in the server bootstrap. Its centered 1920px rail produces an 1856×381px desktop frame with a 96px text inset; at 401px it selects the configured 1024×397 mobile artwork in a 369×143px frame with a 24px inset. Hybrid text/CTA remains admin-driven, image-only banners stay artwork-only, indicators appear from 640px, and the five-second carousel supports swipe, keyboard, focus/visibility pause and reduced-motion without legacy global hero selectors.
- Homepage Section 4 keeps the managed `shopByCategory` labels, images, badges, colors and links while presenting them in a compact shared-controller carousel. Desktop uses a centered 1920px rail with 130×110px cards on a 154px step; at 398px, 90×95px cards advance every 100px so three cards and most of a fourth remain visible. The single desktop Next control, three-second autoplay, drag, focus/hover pause and reduced-motion fallback reuse the homepage controller without client state or a new request.
- Homepage Section 5 is a self-contained server-rendered five-card deal grid backed by local AVIF artwork and canonical catalog routes. It does not use the shared legacy `.featured-grid`, `.category-card`, `.card-*`, `.cta-btn` or placeholder selectors: desktop is a centered 1800px three-column/two-row layout with the Pre-built card spanning the middle column, tablet retains the two-column span composition, and mobile matches the two-card first row with Pre-built beside stacked Upgrade/Monitor cards. The whole card is the native link; focus, hover and image motion are keyboard/reduced-motion safe.
- Homepage Section 9 is a self-contained server-rendered five-card category grid backed by local AVIF artwork and canonical `/tim` links. It does not use the shared legacy `.promo-card` selectors: desktop at 1500px and above is one centered five-card 5:6 row capped at 1700px, tablet is three columns, and mobile uses two 3:2 cards above three 25:23 cards. Focus, hover and image motion are keyboard/reduced-motion safe.
- Homepage Section 14 is an independent source copy of the Section 9 presentation. It owns its card configuration, `section14` CSS variable namespace and DOM test hooks, imports nothing from Section 9, and shares only the existing static AVIF assets. It remains mounted after Section 11 with `id="section-14"`, so future edits to either component do not alter the other.
- Homepage Section 16 receives `featuredNews` through the server bootstrap and renders the ten newest unique public articles belonging to active news categories marked featured. The payload's selected `category_url` drives the tag destination. Thumbnail, title and `Xem thêm` open the article route in a protected new tab, while the tag independently opens its category; a legacy payload without `category_url` leaves the tag as text. The shared carousel/card geometry, one-/three-line clamps and server-only loading remain unchanged, with no browser news request or client state.
- Homepage Sections 6, 10, 12 and 13 are temporarily unmounted: `page.tsx` does not import/render them and neither category `178` nor `521` is requested by bootstrap/fallback. Sections 12/13 are static placeholders and have no API to disable. Their source components, styling and shared carousel implementation remain available. Section 17/category `1087` remains the sole consumer of the homepage-product-section data pipeline.
- Homepage Section 8 reads its configurable featured collection through the existing server-side bootstrap request. The current local configuration is collection `896` / `goi-y-cho-ban`, title `Gợi ý cho bạn`, limited to 10 sellable products; it does not issue a browser-side collection request. Each 280px desktop / 180px mobile carousel item renders the shared `ProductGridCard` used by Section 11 and collection detail. The homepage-only raw carousel runtime controls every non-hero `.carousel-track` plus opt-in Section 11 mobile tracks with a one-card buffer, optional clones, three-second auto-slide, mouse/touch drag, focus/hover/visibility pause, reduced-motion gating, indicators and resize cleanup. Actual pointer movement suppresses only its synthetic click; ordinary click and keyboard behavior remain intact. A nonvisual Next.js adapter owns the idempotent lifecycle without adding client state.
- The dormant Section 10 component retains category `521`, its eight-product limit, Vietnamese CTA and shared `ProductGridCard` variant. It is not part of the current homepage module graph or bootstrap payload; Section 6 is dormant under the same policy, while Section 17 continues using the legacy-card default.
- Homepage Section 11 category-feature blocks render up to nine real sellable products supplied by `web-admin`. Below 640px the configured outer frame is removed and one DOM becomes a 130px compact hero, a 20px category title with localized `Xem tất cả`, and a ~1.8-card carousel. The shared homepage controller adds seamless three-second autoplay and 20% touch/mouse dragging, pauses offscreen/on focus/when the tab is hidden, and preserves native snap scrolling for no-JavaScript or reduced-motion users. At `sm` it restores the original DOM/inline state and the existing two/three-column grid returns; `xl` keeps the hero across three of six columns opposite three products and six cards below. Product-card markup, category-page behavior and API contracts are unchanged.
- Product/category dynamic slug pages, category filters/sort/pagination, search, and collections.
- Collection detail renders a visible collection-name H1 before the sanitized database `description`, preserving safe authored classes and inline styles while containing oversized media/tables. Its product section repeats the collection name in a high-contrast gradient followed by the solid `(N sản phẩm)` count. It uses two direct canonical price-sort links, 24 products per page, Link-based pagination, and a six/four/three/two-column grid at `xl`/`lg`/`sm`/mobile. Collection detail and Homepage Sections 8, 10 and 11 use the same `ProductGridCard`; a 260px card-container threshold keeps prices, stock state and the cart action aligned without overflow, with narrow cards hiding only the visible `Sẵn hàng` text. The dark storefront frame remains unchanged.
- Shared progressive images reconcile cached success/failure after hydration: loaded images always clear their loading classes, failed images fall back once to the local SVG placeholder, and source changes cannot be overwritten by stale load events.
- Real product cards use the shared `product-card-image-frame`: the media box is always a non-shrinking `1:1` square and portrait/landscape/square images remain centered and uncropped through `object-fit: contain`. Galleries, commerce thumbnails, news and banners keep their specialized layouts.
- Product-category and search pagination use canonical URL state: page one omits `page`, while later pages use `?page=N`. Direct loads and browser Back/Forward restore the requested page; filter/sort changes return to page one, and client API failures stay inside the product grid with a retry action.
- Category headings and SSR document titles use `metaTitle` only when its trimmed value has at least five characters; invalid legacy values such as `0` fall back to the category name. The catalog control bar provides sorting only, without a standalone text search control.
- Product-category pages keep the requested category's metadata/breadcrumb/feature box while backend list, count, price, brand and attribute data includes that enabled category plus all enabled descendants. A configured feature payload fills the existing left-side `85/33` category banner exactly once and is not repeated in the product grid; this category-only presentation omits the CTA while homepage heroes keep it. The right column uses sanitized `summary` when its plain text has at least 10 characters, otherwise it shows `Sẵn kho - Đa dạng - Giá tốt - Bảo hành chính hãng`. Mobile stacks the banner before this summary without horizontal overflow. From 1024px, root-level static-content images and images that are the only element in a direct paragraph are centered at a minimum 60% content width with 20px vertical margins and a 12px corner radius; shared product-description HTML and smaller viewports are unchanged. `/pc-van-phong.html` is the verified descendant-scope route, while `/bo-pc-gaming-livestream.html` verifies the configured banner and static-content image bindings; inactive categories remain 404.
- Canonical brand pages at `/brand/[slug]`; Homepage Section 15 uses the bootstrap-provided canonical IDs/slugs, counts and remote PCMarket logos in a responsive two-to-six-column gallery. Missing/broken logos use a text fallback, the initial 366/378px viewport scrolls internally beneath a fade/chevron, and `Xem tất cả` expands all rows in place without an extra browser request. Desktop uses a centered 1800px wrapper with 32px side padding, then adds a 24px-radius glass frame inset 16px inside its 16px-radius inner shell; this decorative frame is hidden below 1024px.
- Shared dynamic breadcrumbs on product, product-category, article, and news-category pages. `/` and `/tin-tuc` intentionally omit them; narrow viewports scroll the trail locally without widening the document.
- The `/tin-tuc` landing preserves `page-tin-tuc.html`'s compiled Tailwind classes and fixed section order: two large newest cards, three smaller cards, six subsequent list rows, the reusable featured-category panel plus a normal-flow `PcBuildPromotionBanner`, PCM Official, and the Review Sản Phẩm grid. One `/api/news/landing` server request supplies all database data. The first five and next six articles never overlap; review cards map as `[0,2,3]` and `[1,4,5]`; missing data never creates sample content. The PCM playlist is the only client island and mounts `youtube-nocookie.com` only after Play.
- News-category pages at `/tin-tuc/[slug]` preserve the bento/classes and responsive 70/30 geometry from `danh-muc-tin-tuc.html`: three current-page articles form the 2/1/1 bento, up to 18 remaining articles form the two-column list, and the sidebar renders API-featured categories, four global most-viewed articles and the reusable `PcBuildPromotionBanner`. `FeaturedNewsCategories` owns only the featured panel markup and accepts `NewsCategory[]`; `MostReadNews` owns only the ranked article panel and accepts `NewsItem[]`, so both can be reused independently of `CategorySidebar`. The intermediate category-filter/sort strip is intentionally absent. Direct sort URLs remain supported, pagination is canonical, and share/copy is the only client island. On desktop the promo sticks 110px below the top so the header cannot cover it; mobile keeps normal flow. Header/Footer and empty-category behavior remain shared and unchanged.
- News-article pages at `/tin-tuc/[slug]` preserve the markup/classes and responsive 70/30 geometry from `single-bai-viet.html`. Real article metadata, sanitized content and tags fill the left column, followed by up to six newest articles from the displayed category; the current article is excluded and no global fallback is used. The right sidebar directly imports `FeaturedNewsCategories`, `MostReadNews` and `PcBuildPromotionBanner`, omits “Cùng danh mục”, and retains the desktop-only 110px sticky promotion. Facebook/X/copy is the only article-detail client island; missing author data uses `PCM` and empty tags leave only share controls.
- Product detail renders independent “Sản phẩm tương tự”, “Sản phẩm đã xem”, and “Bài viết liên quan” sections only when each has content. The two product-card sections show six cards initially, disclose up to six more, cap at 12, and switch from the existing two/three/five-column matrix to six columns at 1536px. Recently viewed history keeps browser-local schema version `1`, hides the current product, stores the current snapshot plus up to 12 prior cards, and revalidates those prior cards in one bounded request.
- Product and product-category detail pages render an optional API-provided “Lý do nên mua” accordion. It is absent when no active entity-specific guide exists and is intentionally not rendered on homepage, search, or news pages.
- Product detail renders only active API-provided vouchers that apply globally or to the product category tree. The voucher card and “Xem tất cả voucher” action are absent when the list is empty; copying a code never bypasses server quote validation.
- The independent numbered product-promotion block uses the embedded `productPromotions` array and hides when empty. Active managed promotions render first in priority order and retain optional safe `Xem chi tiết` links; sanitized `product-editor` rows follow in database line order and continue the same numbering while preserving allowlisted colors/emphasis/alignment. The storefront never receives raw `specialOffer`, issues no follow-up promotion request, and never changes quote or order values.
- Guest cart stored under `hacom.cart.v1` and server-validated quote.
- Checkout with customer/contact/address/invoice fields, voucher quote, CAPTCHA, idempotent order submission, and preserved retry state.
- Customer registration, verification, login, password recovery/change, profile, addresses, and order history under `/tai-khoan`.
- Real catalog cards and the product gallery expose one accessible favorite control. Guests are sent to login without a favorite API request; successful intent login saves idempotently and continues to `/yeu-thich`. Signed-in card states are deduplicated into batches of at most 100, shared across duplicate cards, and the separate noindex list loads 24 live cards per cursor page with retry/load-more/remove states.

## Data boundaries

- Product detail/category and news detail/category pages mount the shared `PageViewTracker` only after a successful page resolution. It sends one best-effort same-origin event per navigation/refresh with `keepalive`; it renders no UI and never delays page content.
- Do not move view counting into Server Components, metadata, cached GET APIs or prefetch paths. UUID replays are harmless, while a new navigation must receive a new keyed tracker instance.

- Treat client product price/status as display cache only. Quote/order APIs are authoritative.
- Do not send or trust payment status, voucher validity/quota, customer IDs, address ownership, or totals from browser state.
- Prefix relative media/API paths using the configured API origin; never leak server environment variables into client bundles.
- Public menu/banner/homepage responses are already reduced for runtime use; do not reintroduce admin metadata into client state.

## Flash Sale storefront

The dedicated `/flash-sale` journey is server-rendered from `web-admin GET /api/flash-sales`, then refreshes the same-origin API snapshot every 15 seconds while one local clock drives countdowns. It deliberately retains the storefront's dark background. Each SKU shows the authoritative promotional price snapshot and a semantic colored progress bar for remaining quota; sold-out controls are disabled. Product cards outside this page also display the Flash Sale badge/progress when their existing product payload carries `flashSale`. Browser prices and remaining values are presentation only; cart quote and order APIs remain authoritative.

## Checkout contract

At submit time:

1. Validate and focus the first invalid field without clearing user input.
2. Generate/reuse one `crypto.randomUUID()` idempotency key for the active submission attempt.
3. Load/execute reCAPTCHA for action `order_submit`; do not eagerly load it for every page visitor.
4. Send `Idempotency-Key` and `recaptchaToken` to `POST /api/orders`.
5. Preserve the key across uncertain network/5xx outcomes so retry cannot duplicate the order. Reset it only when the attempt is conclusively invalid or a new order starts.

Handle the backend error envelope by category:

- `VALIDATION_ERROR`: show field errors and focus the first invalid field.
- HTTP `429`: read `Retry-After`, preserve all input, and show a countdown.
- Network failure: keep values/key and offer a safe retry.
- Idempotency conflict `409`: stop automatic retry and explain that the request contents changed.
- System error: show the request ID for support without exposing raw details.

## Customer forms and reCAPTCHA

Anonymous high-risk customer actions request a token only when submitting:

- `customer_register`
- `customer_login`
- `password_reset_request`
- `password_reset_confirm`
- `verify_email`
- `otp_resend`

Authenticated customer forms rely on the HttpOnly session and backend origin/rate-limit controls; only use step-up CAPTCHA when the API requires it.

### Local reCAPTCHA configuration

Create a v3 key in the Google reCAPTCHA Admin Console and add `localhost` plus the production storefront hostname. Put only the public site key in `D:\web-tech\font-end\.env.local`:

```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_public_site_key
```

Restart/rebuild the storefront after changing it because `NEXT_PUBLIC_*` values are compiled into the browser bundle. Never place the secret key here. For local development without Google, leave this value empty and enable the backend-only non-production bypass documented in `web-admin/README.md`; production never accepts that bypass.

## Form and accessibility rules

- Mirror backend max lengths, input types, `inputMode`, autocomplete, min/max/step, and helper text.
- Keep server validation canonical; browser validation improves UX but is not security.
- Link each error with `aria-describedby`, set `aria-invalid`, use an `aria-live` summary, and focus the first invalid control.
- Preserve field values for validation, rate-limit, network, CAPTCHA, and system failures.
- Prevent double submit with pending state plus backend idempotency; disabling a button alone is insufficient.
- Dialogs must have an accessible name, trap/restore focus, and close with Escape when dismissal is safe.

## Responsive product-category layout

- Product-category pages use a two-column subcategory grid and two-column product grid below `1024px`; from `1024px`, the existing four-column subcategory row, desktop filter sidebar and three-/four-column product grid remain in effect.
- Below `1024px`, the category toolbar exposes the truncated catalog heading plus a `Bộ lọc` dialog trigger. Sort, price, child-category and attribute controls share the desktop URL state and handlers inside a left drawer; applying a control resets pagination but keeps the drawer open.
- The mobile filter trigger uses the catalog's solid active blue treatment. Its sort select relies on the shared native-select background arrow only, avoiding a duplicate decorative SVG.
- Mobile pagination renders no more than five adaptive page tokens in one non-wrapping row; desktop retains the wider range. Below `640px`, category static HTML uses the same 12px outer inset as the product grid and no extra inner horizontal padding, while larger viewports retain their existing spacing.
- The native dialog is capped at `340px` or `100vw - 48px`, leaves the 60px bottom navigation visible on phones, uses full viewport height on tablets, closes with its button, Escape or backdrop, restores trigger focus and closes automatically when the viewport reaches desktop.
- `tests/e2e/category-mobile-filter.spec.ts` covers 390/768/1023/1024px geometry, card containment, compact pagination at start/middle/end, static-content alignment, select decoration, URL updates, dialog focus/dismissal, horizontal overflow and serious/critical Axe findings.

## Responsive search layout

- Search results below `1024px` use 12px horizontal insets, an 8px two-column `ProductGridCard` grid and a result-count toolbar with the same solid-blue `Bộ lọc` trigger as product categories. From `1024px`, the existing desktop sidebar, toolbar sort and three-/four-column grid are unchanged.
- The native left dialog contains sort, price and attribute filters and shares its renderer/state with the desktop sidebar through surface-prefixed IDs. Applying sort or filters keeps `q`, resets pagination to page one and leaves the drawer open; reset keeps both `q` and the selected sort.
- Category and search use the same pure pagination-token helpers. Mobile renders at most five non-wrapping tokens; desktop keeps the wider token range. The drawer follows the category contract for phone bottom-navigation clearance, tablet height, scroll locking, focus restoration and button/Escape/backdrop/desktop dismissal.
- `tests/e2e/search-mobile-layout.spec.ts` covers 390/768/1023/1024px grid/card geometry, toolbar and desktop boundaries, drawer dimensions/focus/dismissal, sort/price/attribute/reset URL behavior, compact pagination, horizontal overflow and serious/critical Axe findings.

## Performance rules

- Server components call `web-admin` through server-only `API_INTERNAL_URL`; browser requests use same-origin `/api/*` paths.
- Product detail requests `include=core` and streams `/api/products/[slug]/supplemental` without changing section order. Recently viewed content loads near the viewport.
- Run `npm run perf:budget` for no-regression budgets and `npm run perf:budget:release` for strict 205 KB product/170 KB commerce release targets.
- Run `npm run test:e2e` after `npx playwright install chromium`; set `PLAYWRIGHT_PRODUCT_SLUG` to include carousel checks. For an isolated production run, set `PLAYWRIGHT_BASE_URL` and `PLAYWRIGHT_SERVER_URL` to the same unused local URL and set `PLAYWRIGHT_SERVER_COMMAND` to a matching `next start` command; Playwright will own that server for the suite lifecycle. `npm run perf:lighthouse` writes local reports when the Chrome/Lighthouse runtime is healthy.

- Keep server components by default and minimize client boundaries/state duplication.
- Dynamically import heavy dialogs/carousels and delay reCAPTCHA/nonessential scripts until interaction.
- Use responsive `next/image`, AVIF/WebP, dimensions, lazy loading below the fold, and preload only the actual LCP image.
- Avoid request waterfalls; fetch independent data in parallel and use the homepage bootstrap/public caches.
- Respect ETag/cache behavior and do not add per-product attribute requests when product/search payloads already include card badges.

## UI preservation rules

For established homepage `Section*.tsx` markup, bind dynamic data into existing structure unless a task explicitly requests a redesign. Do not duplicate a section in another component, add wrappers/classes merely to consume data, or silently restore stale hardcoded content after an API failure.

## Verification status

Focused Section 11/8/10 carousel Playwright passes 20 runnable checks with 14 expected project skips for exact 397px mobile geometry, the 360/390/428/639/640 transition matrix, autoplay/offscreen/focus behavior, native touch thresholds, reduced-motion fallback, accessibility, desktop placement and shared-controller lifecycle cleanup.

The `2026-07-17` working tree passes TypeScript, ESLint `--quiet` and production build in both applications; admin unit tests pass 144/144 and the integration suite passes 17 cases with 7 expected safety-gated skips. Focused Section 5 Playwright passes 3/3 for exact desktop/mobile geometry, responsive transitions, images, routes, hover/focus, overflow and accessibility. Focused Section 8 carousel Playwright passes 9 runnable desktop/mobile checks with 5 expected project-specific skips. Focused Section 10 carousel Playwright passes 4 runnable checks with 2 expected project-specific skips, covering the shared Section 10/11 card contract, keyboard cart activation, square media, explicit responsive widths/overflow, accessibility and drag-without-navigation. Focused news-landing Playwright passes 4/4 desktop/mobile checks; the full controlled four-worker suite passes 105 cases with 17 expected fixture/device skips across 122 cases. The older 12-worker resource-exhausted run remains historical and is not a current product failure.

Current referenced JavaScript exceeds both regression and release budgets for product detail (255 KB), cart (184.3 KB), checkout (199.6 KB), combo cart (177 KB), and combo checkout (196.2 KB). Local health currently passes 22/22. These are local regression observations, not production Web Vitals or 1,500-user capacity evidence. See `../PROJECT_AUDIT_2026-07-15.md`.
