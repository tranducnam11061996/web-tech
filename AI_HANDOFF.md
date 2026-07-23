# AI Handoff — HACOM Workspace

Last verified: `2026-07-24`

## Local admin audit log baseline was reset

- At the user's explicit request, all 460 rows were deleted transactionally from `it_tech_db.admin_audit_logs`; an independent read-only verification confirmed the table remains present as InnoDB with 0 rows.
- No table, schema, permission, admin account, session, or other audit/import history was changed. New admin activity continues writing to the existing table.

## Admin header uses TrucTiepGAME branding

- The web-admin header wordmark now renders `TrucTiepGAME` instead of the split `HACOM`/`Admin` label, preserving the existing red/white treatment and layout.
- The application icon's accessible label now uses the same brand name. No route, permission, API, schema, or data contract changed.

## Product Frame admin screens are hidden

- The sidebar no longer exposes `Quản lý khung sản phẩm`.
- `/product/product-frame`, `/product/product-frame/product`, and `/product/product-frame-edit` terminate through Next.js `notFound()` while the dormant components, permissions, APIs, and database data remain intact for a future explicit re-enable.
- No schema, migration, permission, or data change was made. Both app typechecks, quiet lints, and production builds pass; backend unit tests pass 208/208 and integrations pass 28 with 14 guarded skips.

## Voucher direct-product scope

- `/sales/vouchers` now combines direct SKU scope with the existing dynamic category-root scope using OR semantics. Leaving both scopes empty remains global; direct selections are capped at 500, may include hidden catalog rows, and are stored in `web_admin_voucher_products`.
- Product-detail discovery and checkout quote use the same global/direct/category rule. Discount math, minimum-order behavior, quota locking and redemption transaction boundaries are unchanged; duplicate direct/category matches contribute to eligible subtotal only once.
- Admin voucher GET/POST/PUT now project and persist `productIds`; the list exposes `productCount`. Missing catalog IDs are omitted from the edit draft and removed on the next explicit save. The storefront voucher modal relies on the authored `description` and no longer renders an inferred scope line; checkout scope notes are no longer generated.
- The additive migration was applied to identified `it_tech_db` after a 310-table/100,214-row restore-verified logical backup (SHA-256 `b11e4e7bae11db0f46d0b7720c9df0b0caa791bdef6aed53949c49c3d0f1a199`). Live verification found 2 vouchers, 31 category links and 0 initial product links; schema integration and the full destructive clone integration both pass. Both app typechecks, quiet lints and production builds pass, backend unit tests pass 208/208, integrations pass 28 with 14 guarded skips, and local healthcheck passes 22/22.

## Footer menus use dynamic managed content

- `Footer Menu` keeps one structural root but accepts zero or more arbitrarily named groups and zero or more custom links per group. `Bottom Footer` keeps one structural group whose heading and custom-link count are dynamic. Both admin validators enforce the three-level tree and a 200-node safety ceiling without comparing names or counts to seed data.
- The shared editor protects the structural root (and the single Bottom Footer group), exposes only valid group/link actions, duplicates nodes beside their source under the same parent, hides the unused frontend-label setting, and retains draft/publish, ordering, active state and visibility controls. Published empty content is valid: empty/inactive Footer groups are omitted, an empty Footer nav and Bottom Footer rail are not rendered, and only a missing/corrupt/unavailable published source uses the code seed fallback.
- Public API URLs and shapes remain unchanged: Footer returns a dynamic `groups` array and Bottom Footer returns a dynamic `heading` plus `links`. No schema, migration, permission, write-gate or current database data change is required.
- Verification passes both app typechecks, quiet lints and production builds, 205/205 backend unit tests, 27 applied integrations with 13 guarded skips, focused Footer Playwright 6/6, and local healthcheck 22/22.

## Shared news metadata and PC Build links

- News-category list cards, all three first-row hero cards, the article header and every related-article card use the shared `NewsCardMeta` renderer instead of PCM author metadata. It renders a semantic `<time>` using the existing `dd/mm/yyyy` formatter followed immediately by an eye-labelled, Vietnamese-localized non-negative `visit` count. The pair is left-aligned with a fixed 16px gap on the existing dark surfaces and can wrap only when the available width requires it.
- The shared red `PcBuildPromotionBanner` labels its pill `PC BUILD BỞI CHUYÊN GIA`. Both full-card links (`PC VĂN PHÒNG` and `PC GAMING`) intentionally target `/pc-van-phong.html` in protected new tabs, matching the requested route contract across news landing, category and article sidebars.
- Focused article/category Playwright passes 13 applied desktop/mobile cases with 3 intentional project skips, including API metadata binding for the article header, related cards, all hero/list cards, exact same-row left geometry, protected popup navigation, sticky/normal-flow behavior and overflow. Both app typecheck/lint/build pipelines pass, backend unit tests pass 198/198, integrations pass 27 with 13 guarded skips, and local healthcheck passes 22/22.

## Managed product promotions use the same bold emphasis

- Storefront product detail now wraps the plain text of every `source="managed"` promotion in semantic `<strong>`, matching the editor-authored promotion lines that already retain their allowed bold markup. An optional `Xem chi tiết` link remains outside the strong element and keeps its existing navigation behavior.
- The requested product route confirms promotion number 1 renders one direct strong element at computed weight 700. Focused promotion Playwright passes desktop/mobile with ordering, rich-text, overflow and Axe coverage; both app typecheck/lint/build pipelines pass, backend unit tests pass 198/198, integrations pass 27 with 13 guarded skips, and local healthcheck passes 22/22.

## Product-gallery utility controls stay above rail arrows

- The thumbnail rail now owns an isolated stacking context. Its navigation arrows use local layer `1`, while every `.product-gallery-utility` (including specifications and video) is positioned on local layer `2`, so an overlapping Previous arrow can no longer intercept pointer interaction intended for a utility.
- Thumbnail geometry, arrow scrolling, carousel state and the specification dialog remain unchanged; no global z-index or `pointer-events` workaround was introduced.
- Focused gallery Playwright passes all 3 desktop cases and the applicable mobile layering case, including overlap hit-testing, specification-modal opening, unchanged rail position on the utility click, working Next/Previous controls and zero horizontal overflow. Both app typecheck/lint/build pipelines pass, backend unit tests pass 198/198, integrations pass 27 with 13 guarded skips, and local healthcheck passes 22/22.

## Product-detail Combo configurator

- The add-on picker now presents a responsive tech-premium configurator rather than a separate legacy card surface. Its fixed header, accessible keyboard tabs, search/meta toolbar and optional pagination surround the only scrollable product grid; the grid uses two/three/four/five/six columns at `<640`/`640`/`1024`/`1280`/`1600px`, while sparse desktop groups are centered at the canonical 280px card width.
- Modal products render the shared `ProductGridCard` DOM and container-query styling. An internal Combo action mode displays `comboUnitPrice` against the current sell price, toggles the parent selection immediately with `aria-pressed`, and never calls or identifies as the ordinary cart action. Product links open in protected new tabs; the default card/cart/link contract everywhere else remains unchanged.
- The dialog reuses the shared scroll-lock/focus-trap/Escape/restore hook, exposes Arrow/Home/End tab navigation and includes card-shaped loading skeletons, retry and query-aware empty states. No Combo API, quote, cart, schema or database contract changed.
- Focused Combo Playwright passes 5 applied desktop/mobile cases with one intentional project skip across the 390/768/1024/1440/1920 matrix, selection persistence, cart isolation, new-tab navigation, focus restoration and Axe serious/critical coverage. Shared-card regression passes 11/11; both app typecheck/lint/build pipelines pass, backend unit tests pass 198/198, integrations pass 27 with 13 guarded skips, and local healthcheck passes 22/22.

## Desktop product gallery follows the purchase column

- In the three-column product-detail layout from `1200px`, `ProductCarousel` measures its visible gallery content against `.product-purchase-column` with `ResizeObserver`. A shorter gallery uses native `position: sticky` at the established 110px desktop offset; an equal/taller gallery and all narrower layouts remain in normal flow.
- The outer `.product-gallery-column` receives a boundary height equal to the purchase column, so the sticky content stops at the purchase-column bottom even when the middle information column is taller. No scroll listener, API, product data or carousel interaction contract changed.
- Focused desktop Playwright passes 2/2 across 1200/1440/1920px plus breakpoint and dynamic-height cases. The related product-detail regression passes 4 applied cases with one intentional project skip; both app typecheck/lint/build pipelines pass, backend unit tests pass 198/198, integrations pass 27 with 13 guarded skips, and local healthcheck passes 22/22.

## Product-detail Combo footer follows the add-on selection

- `ProductComboBuilder` no longer renders `.product-bundle-footer` until at least one add-on SKU is selected. Selecting the first SKU mounts the subtotal/savings and `Mua combo` action immediately (including the existing quote-loading state); removing the final SKU or switching Combo Sets removes the footer from the DOM and tab order.
- Quote, Combo Cart, API and CSS contracts are unchanged. Focused Playwright passes in desktop and mobile Chromium on `/pc-ultra-gaming-i7-14700kf-rtx-5070-12gb`.

## Combo Set product and category scope

- `/product/combo-set/product?id=...` now manages one effective scope assembled from direct `combo_set_product` rows and dynamic category roots in `web_admin_combo_set_categories`. The page exposes immediate-save product search plus a draft/save two-column category tree, then deduplicates the effective product list and labels every row with its direct/category source.
- Category roots include current and future descendants at read/quote time; public Combo summaries and quote validation use the same server-owned applicability check. Direct relations retain their legacy per-product ordering and `combo_set.product_count` remains the direct count.
- The additive table has a cascading FK only to `combo_set`; category IDs remain logical references. Category import backup/detach/rollback now preserves this scope, and the shared cycle-safe category hierarchy cache is invalidated through the existing category mutation path.
- `PATCH /api/admin/combo-sets/[id]/scope` requires `catalog.combo_sets.update` and supports `add-product`, `remove-product`, and canonical `replace-categories`. The Product Group SKU picker now wraps the same accessible catalog picker primitive without changing its `assignment=available` behavior.
- The category modal intentionally uses `overflow: clip` on its outer panel. `overflow: hidden` still made that panel a scroll container, so Chrome focus-scrolled it when a visually hidden tree checkbox was selected, moving header/body/footer upward and leaving an equal blank area below. Only the middle row is scrollable; the opaque compositor-free backdrop, definite `92vh`/`760px` height and disabled middle-row scroll anchoring are secondary safeguards.
- The migration was applied idempotently to identified local database `it_tech_db`; Combo `713` remains unchanged at one direct product and zero category roots. Both app typecheck/lint/build pipelines pass, backend unit tests pass 198/198, integrations pass 27 with 13 guarded skips, the write-enabled focused scope integration passes 1/1, and healthcheck passes 22/22.

## Combo Set creation, permissions and unlimited end time

- `/product/combo-set/list` now links `Thêm mới` directly to `/product/combo-set/edit`; the edit route's existing no-ID branch initializes a new Combo Set and its client submits the existing canonical payload to `POST /api/admin/combo-sets`.
- Combo Set API mutations now map by HTTP method: POST requires `catalog.combo_sets.create`, PATCH requires `.update`, and DELETE requires `.delete`. Page access remains protected by `catalog.combo_sets.read`; no schema, payload or storefront combo change was made.
- The editor now models `to_time = 0` explicitly as `Không giới hạn thời gian`, which is the default for a new Combo Set. A native radio switches to a bounded end date; the first switch seeds a draft from the start time plus 30 days (or current time plus 30 days), keeps that draft while toggling modes, and validates that a bounded end is valid and later than the start. Existing zero/positive timestamps hydrate into the matching mode and the list labels zero as `Không giới hạn`.
- Combo product discounts now use digit-only text inputs with numeric touch keyboards; pasted separators/non-digits are removed while a temporary blank value remains editable. `Thêm Nhóm Sản Phẩm` prepends an expanded new group so it is immediately visible above existing groups.
- Verification passes both app typecheck/lint/build pipelines, 197 unit tests, 27 applied integrations with 12 destructive guards skipped, focused Combo Set tests 12/12 and local healthcheck 22/22. The API, database and storefront runtime contracts remain unchanged.

## Brand editor and shared Brand/Collection catalog layout

- `/product/brand` loads full edit data only when an Edit action opens. The accessible 1200px modal labels `idv_brand.summary` as plain `Mô tả tóm tắt`, edits `idv_brand_info.description` as offline TinyMCE `Mô tả`, and uses a strict text-based integer control for ordering.
- TinyMCE images retain the `brands` scope. The separate Brand-logo picker accepts JPEG/PNG/WebP/GIF up to 10MB, previews locally and uploads only during save through `POST /api/admin/brands/images/upload`; the route checks permission, metadata and file signature before writing a dated `MEDIA_ROOT/brand/...` path. PATCH accepts an optional safe `image`, preserving the existing value when omitted, and saves Brand plus seller-zero SEO/content in one transaction.
- Storefront Brand and Collection pages share one server-rendered catalog-detail layout. Brand H1 is conditional: sanitized `description` must contain at least 10 readable characters or one safe image `src` (including an image-only banner); empty TinyMCE wrappers and short text hide it. Collection H1, Brand description rendering, product heading, sort, responsive grid and pagination remain unchanged.
- Current verification: both app typechecks, quiet lints and production builds pass; backend unit tests pass 191/191 and integrations pass 27 with 12 guarded skips; focused Brand Playwright passes 5/5 desktop plus 4/4 mobile with one intentional breakpoint skip; local healthcheck passes 22/22.

## Desktop product-description standalone images

- Product-detail CMS descriptions now carry a product-only `data-product-static-html` hook. From `1024px`, root images, direct single-image paragraphs and the live legacy `<p><span><img></span></p>`/link-wrapper shape render as centered blocks with `min-width: 60%`, `max-width: 100%`, automatic height and 20px vertical margins.
- Paragraphs with multiple images, the no-description thumbnail/summary fallback, product-category content and viewports below 1024px retain their existing presentation. No sanitizer, CMS data, API or database contract changed.
- Focused product/category image Playwright passes 4 applied cases with 4 intentional cross-project skips. Both app typecheck/lint/build pipelines pass, backend unit tests pass 186/186, integrations pass 27 with 11 guarded skips, and local healthcheck passes 22/22.

## Product-card attribute Preview uses the selected category branch

- `/product/card-attributes` now resolves its sample product from the selected category first, then active descendants. Parent categories that own rules but have no directly linked SKU therefore render a real Preview instead of the empty `No preview product` card.
- Preview selection accepts only active product-category links with an enabled positive-price SKU, keeps direct-category priority, and loads the chosen product's existing attribute values for live badge rendering. The admin API/schema and storefront badge contract are unchanged.
- Preview badge construction deduplicates draft/inherited rules by `attribute + slot` before rendering, matching the backend's first-rule-wins save contract, and deduplicates repeated legacy attribute values. React badge keys remain stable without hiding genuinely distinct values.
- Focused preview regressions pass 2/2 plus the descendant-only integration; both app typecheck/lint/build pipelines pass, backend unit tests pass 186/186, integrations pass 27 with 11 guarded skips, and local healthcheck passes 22/22.

## Product Group attribute sections use a two-column editor

- `/product/product-group/edit` renders each attribute as one independent section. From the desktop breakpoint, its left column owns the attribute name and ordered value controls, while its right column repeats the group SKU list and exposes only that attribute's value selection per SKU.
- Every section keeps a solid-blue `Thêm sản phẩm` action directly below its SKU list, aligned with the identically styled `Thêm value` action in the left column, and opens the same shared product picker. Removing a SKU from any section removes it from the group and therefore every section; attribute/value ordering and removal continue to clean related selections through the existing state handlers.
- New attributes are prepended, re-ordered canonically and focused immediately. Each SKU value select offers `Tạo value mới…`; its inline Enter/submit flow trims the name, reuses a case-insensitive match or the first blank slot, otherwise appends a value, and atomically selects it for the active SKU so both columns stay synchronized. Escape/cancel leaves the group unchanged and the 50-value limit remains enforced.
- Admin payloads, Product Group APIs, transactional persistence, limits and storefront projection are unchanged. Focused editor-state tests pass 5/5; both app typecheck/lint/build pipelines pass, backend unit tests pass 184/184, integrations pass 26 with 11 guarded skips, and local healthcheck passes 22/22.

## Voucher form numeric text fields and searchable two-column category selector

- `/sales/vouchers` keeps quantity, discount, maximum-discount and minimum-order controls as digit-only text while editing. Pasted separators are removed, temporary blanks are allowed, inline errors are associated with their fields, and a valid submission converts these values to the existing numeric API contract.
- Voucher category scope uses two columns on desktop: removable selected items on the left and the searchable indented active parent-child tree on the right. Search is accent-insensitive by name/ID and selecting a parent still stores only that root and applies through descendants at runtime; inactive or missing selected categories remain visible for removal.
- The shared Product Promotion two-panel layout remains compatible. No API, schema or database change was made. Both app typecheck/lint/build pipelines pass, backend unit tests pass 179/179, integrations pass 26 with 11 guarded skips, and local healthcheck passes 22/22.

## Product-detail related grids use a 6 × 2 disclosure

- “Sản phẩm tương tự” and “Sản phẩm đã xem” now share one storefront layout contract: six cards initially, up to six more after `Xem thêm`, and a maximum of 12 cards per section. The responsive grid remains two/three/five columns below `1536px` and switches to six columns at the `2xl` breakpoint.
- Similar products remain server-rendered from the unchanged supplemental API. Recently viewed remains a deferred client island, keeps localStorage schema version `1`, excludes the current product, stores the current snapshot plus at most 12 prior products, and revalidates those 12 IDs in one bounded request. The static-card image hint now reflects the six-column desktop width.
- Focused related-card, square-image and empty-state Playwright passes 13/13 across the explicit `390/768/1024/1535/1536/1920px` matrix. Both application typechecks, quiet lints and production builds pass; backend unit tests pass 173/173, integrations pass 25 with 12 guarded skips, and local healthcheck passes 22/22.

## Final audit and dependency patch

- The complete manual component bundle has been audited across storefront layout/accessibility, homepage data contracts, admin permissions, upload validation, backend integration, media and tests. External Zalo navigation now uses protected new-tab semantics; generated Next/TypeScript artifacts stay outside the commit.
- The audit found and patched the PostCSS source-map advisory by pinning both applications to `8.5.22`; production dependency audits now report zero vulnerabilities. Product attribute badge colors now meet the exercised WCAG AA contrast checks, and every homepage carousel remains static when `prefers-reduced-motion: reduce` is active.
- Playwright can now own an isolated production server through `PLAYWRIGHT_SERVER_COMMAND`/`PLAYWRIGHT_SERVER_URL`, avoiding reuse of a stale port-3001 dev process. The full 294-case, four-worker audit executed 210 pass/79 intentional project skips/5 timing-state failures; all five failing cases passed immediately in a controlled one-worker rerun at 6 pass/4 project skips.
- Final required verification passes both app typechecks, quiet lints and production builds, 197/197 backend unit tests, 27 applied integrations with 12 guarded skips, zero production dependency vulnerabilities and local healthcheck 22/22.
- JavaScript budgets remain open at product detail 255 KB, cart 184.3 KB, checkout 199.6 KB, combo cart 177 KB and combo checkout 196.2 KB; all exceed both current regression and release limits. Do not claim the release is performance-budget clean or validated for 1,500 VUs.

## Strict search intents for Windows 11, microphones, HDD and speakers

- Production lexical search now resolves exact aliases through one positive title-intent registry before Fuse selection, ranking, filtering, sorting, pagination and facet construction. `win 11`/`win11`/`windows 11` share canonical query `windows 11`; `mic`/`micro` share canonical query `mic`; exact `hdd`, `loa` and the existing `pc` intent retain their own title predicates. Queries with extra qualifiers keep the general search behavior.
- The storage synonym group no longer merges SSD, HDD and generic `o cung`: SSD maps only to `o cung the ran`, HDD maps only to `o cung co`, and generic `o cung` remains an unforced storage query. No database, API response, storefront or `product_data_search` change was required.
- The active catalog now returns `2/2/2` Windows 11 software products, `3/3` microphones, 6 HDDs and 6 speakers for the seven requested aliases. Full-page ranking regression passes across default/price/newest with identical alias candidate IDs; focused browser smoke verifies every rendered card. Both app typecheck/lint/build pipelines, 173 backend unit tests, 25 applied integrations with 12 guarded skips, and local healthcheck 22/22 pass.

## Desktop category static-content images

- Product-category static HTML now has a category-only DOM hook. From the `lg` breakpoint, a root-level image or the sole element inside a direct paragraph is a centered block with `min-width: 60%`, `max-width: 100%`, automatic height, 20px vertical margins and a 12px corner radius.
- Product-description HTML and viewports below 1024px retain their existing image presentation. Focused desktop/mobile Playwright covers the live `/bo-pc-gaming-livestream.html` CMS structure, the direct-image and multi-image selector boundaries, disclosure behavior and horizontal containment.

## Mobile product-category grid and filter drawer

- Product-category pages below 1024px now use 12px page insets, an 8px two-column grid for the four available positive-count child categories, and a two-column `ProductGridCard` catalog. At 1024px the existing four-column child-category row, 300px sidebar, desktop sort and three-column grid return; `xl` remains four columns.
- The mobile toolbar contains the ellipsized catalog title and a labeled filter trigger. Its native left dialog reuses the same sort, price, child-category and attribute render helper/state as desktop with surface-prefixed IDs; filter/sort changes keep the drawer open, update the canonical query and reset page, while reset preserves sort.
- The trigger now uses solid catalog blue with a white 18px icon and visible focus ring. Mobile sort uses only the shared native-select background arrow. Mobile pagination is capped at five adaptive tokens (`1 2 3 … N`, `1 … current … N`, or `1 … N-2 N-1 N`) in one row; desktop keeps the previous wider range.
- Below 640px, the static category article aligns with the product grid at a 12px viewport inset and removes its nested horizontal padding. Its vertical spacing, disclosure/fade, sanitized CMS content and all spacing from 640px remain unchanged.
- The drawer is at most 340px wide, leaves the fixed 60px bottom navigation uncovered on phones, fills tablet height, locks background scroll, supports close button/Escape/backdrop, restores trigger focus and auto-closes at desktop. Native buttons, labels, expansion state and corrected count-badge contrast provide keyboard and WCAG support; desktop promo cards remain outside the drawer.
- Focused Playwright passes 5/5 on each desktop/mobile Chromium project across 390/768/1023/1024px, including card/footer containment, pagination start/middle/end, static alignment, URL behavior and Axe serious/critical checks. Both app typecheck/lint/build pipelines, 173 backend unit tests, 25 applied integrations with 12 guarded skips, and strict plus empty-catalog local healthchecks at 22/22 pass.

## Mobile search grid and filter drawer

- Search results below 1024px now match the category catalog surface: 12px page insets, an 8px two-column `ProductGridCard` grid, an ellipsized result count and a solid-blue `Bộ lọc` trigger. At 1024px the existing desktop sidebar, toolbar sort and three-/four-column grid remain unchanged.
- A native left dialog reuses one render helper with the desktop sidebar for sort, price and attribute controls. Surface-prefixed IDs prevent duplicate controls; query updates retain `q`, reset page to one and keep the drawer open, while reset preserves both `q` and sort. The drawer retains phone bottom-nav clearance, tablet full height, scroll locking, focus restoration and button/Escape/backdrop/desktop dismissal.
- Category and search now share pure desktop/mobile pagination token helpers. Mobile search uses at most five non-wrapping tokens while desktop preserves its wider range. Focused Playwright passes 4/4 in each desktop/mobile Chromium project across 390/768/1023/1024px, and the shared category/catalog regression passes 24/24. Both app typecheck/lint/build pipelines, 173 backend unit tests, 25 applied integrations with 12 guarded skips, and both local healthcheck modes at 22/22 pass.

## Responsive shared storefront Footer

- `font-end/src/components/Footer.tsx` now owns a reference-matched responsive presentation shared by every storefront route: a centered 1800px desktop composition from `xl` and a 24px-inset mobile flow with two-column managed link groups, stacked contact cards, centered social/certification blocks, a native-scroll partner rail and left-aligned Vietnamese legal copy.
- The existing `/api/menu/footer` four-group payload and `/api/menu/bottom-footer` partner payload remain the only dynamic Footer contracts. Labels, URLs, suffixes and order render through `.map()`; the partner track centers itself when it fits and retains native horizontal scrolling when it overflows. All TrucTiepGAME copy, Vietnamese contact/legal text and the local Bộ Công Thương/DMCA images remain source-owned.
- Desktop typography increases by a balanced 1–2px from `1280px`; the wider top/menu columns, 460px description, 430px newsletter and expanded large-screen contact/certification widths use the added space without changing mobile/tablet. Footer height now follows its content instead of enforcing a 1095px desktop minimum, and the final line has no bottom margin, leaving only the intentional 64px container padding. The newsletter email field is editable and autofill-compatible, while its submission button remains explicitly disabled until a backend exists. Focused Playwright passes 4/4 across desktop/mobile geometry, input behavior, centered partners, the full breakpoint matrix, a shared non-home route and Axe serious/critical coverage.

## Full workspace audit before GitHub sync

- Audited the complete dirty workspace after the manual component edits, including storefront semantics/responsive geometry, homepage bootstrap contracts, PC Builder v5/v6, admin/public API boundaries, tests, migrations, media and dependency locks. Fixed invalid nested interactive elements and internal new-tab links in the homepage promotion cards while preserving their visual classes.
- Restored Section 5's exact 428px/1800px geometry, aligned Section 7 with the documented Vietnamese AI laptop-finder copy, and completed the Section 10 switch to category `521` (PC văn phòng). Homepage product sections now include enabled descendants through the bounded public category scope, and the bootstrap category IDs match the storefront configuration.
- Dependency overrides pin `sharp` `0.35.3`; both package audits report zero vulnerabilities. Final verification passes both app typechecks, quiet lints and production builds, all 166 backend unit tests, 24 applied integrations with 12 guarded skips, the complete 232-case Playwright suite at 171 passed/61 intentional project skips/0 failed, and local healthcheck 22/22.
- The existing JavaScript budget release blocker remains open: product detail 240.1 KB, cart 174.9 KB, checkout 190.2 KB and combo checkout 186.8 KB exceed their limits; combo cart passes at 167 KB. Do not describe the current build as performance-budget clean.

## Homepage Sections 6, 10, 12 and 13 temporarily unmounted

- Homepage no longer imports or renders Section 6/category `178`, Section 10/category `521`, Section 12 or Section 13. Their component files, shared renderer, CSS and carousel controller remain intact for later reactivation.
- The server bootstrap and storefront fallback now request only category `1087` for the retained Section 17 pipeline. `productSections` and the generic `/api/categories/homepage-product-sections` contract remain available; no database or schema change was made.
- Sections 12 and 13 are static placeholder components with no API or server data dependency, so disabling them requires no backend change. Focused desktop/mobile Playwright confirms all four dormant section IDs are absent, surrounding Sections 5/7/9/11/14 remain ordered, no browser product-section request occurs, and the API excludes categories `178`/`521`.

## Homepage Section 14 independent Section 9 copy

- Section 14 now owns a complete source-level copy of Section 9's five-card grid, including its card configuration, Tailwind layout, responsive image sizing, links and interaction treatment. It remains mounted after Section 11 with the unique `section-14` ID.
- Internal constants, CSS custom properties and test hooks use the `section14` namespace, and Section 14 imports nothing from Section 9. The two components share only the existing static AVIF files, so either component's code/configuration can evolve independently.
- Focused Playwright compares both components at the 429/768/1024/1499/1500/1920/2537px matrix and covers unique IDs, card geometry, image loading, routes, keyboard focus, reduced motion and Section 14 accessibility.

## Homepage Section 15 responsive brand gallery

- Section 15 keeps the bootstrap-provided brand order, canonical `/brand/[slug]` links, product counts and PCMarket logo URLs while presenting them in a self-contained two-to-six-column gallery. Missing or failed logos fall back to the managed brand name.
- The initial gallery uses a 366px mobile / 378px desktop internal scroll viewport, bottom fade and chevron; `Xem tất cả` or the chevron expands all rows in place and `Thu gọn` restores the scroll viewport at the top. The component no longer consumes the legacy global `.brands-*` or generic section header selectors.
- Mobile uses two 80px cards with 16px gaps; the centered 1800px desktop wrapper uses six columns with 20px gaps. Background glows, logo/card motion, keyboard focus and the thin desktop scrollbar are component-scoped and reduced-motion safe.
- From the `lg` breakpoint, the desktop shell is a 16px-radius outer frame and its glass panel is inset by 16px with a 24px radius. The inner frame remains hidden below 1024px, so mobile geometry is unchanged.
- The outer wrapper is capped at 1800px to align with the homepage; its existing 32px desktop padding produces a centered 1736px inner shell. Focused geometry, breakpoint, scrolling, interaction, reduced-motion and Axe coverage passes across desktop and mobile.

## Homepage Section 16 featured-category news

- Section 16 now renders the ten newest public articles across every active article category marked featured in `web_admin_article_category_meta`. The backend merges primary `catId` and active `idv_article_category` membership, deduplicates articles, orders by `createDate DESC,id DESC`, and prefers an active featured primary category for the card tag.
- `featuredNews` is loaded in parallel inside homepage bootstrap version 3, so the storefront Server Component receives the news through the existing single bootstrap request and makes no browser news request. Each item includes the selected category's additive `category_url`; empty data hides Section 16 instead of restoring static sample cards.
- The existing card/carousel geometry remains intact. Article thumbnails fill the existing image wrapper as backgrounds, titles ellipsize on one line, summaries clamp at three lines, and the only added card structure is a bottom action row containing a bordered category tag and the right-aligned `✦ Xem thêm →` article link. Card hover remains stationary and uses only border/shadow feedback so its top corners are never clipped by the carousel viewport.
- Thumbnail, title and `Xem thêm` are independent native article links; the category tag is a separate category link. All four open a new tab with `noopener noreferrer`, retain visible keyboard focus and preserve homepage/carousel state. A legacy payload without `category_url` leaves the tag as non-link text instead of creating a broken route.
- Focused Section 16 Playwright passes 5 tests with 5 intentional cross-project skips, including all four popup destinations, unchanged desktop/mobile geometry, no browser news request and Axe. Both app typecheck/lint/build pipelines, 173 backend unit tests, 25 applied integrations with 12 guarded skips and local healthcheck 22/22 pass.

## Managed Header utility links

- The four account/cart/favorites/assistant controls are now sourced from the published `utilityLinks` area of the managed Header menu on both desktop and mobile. `systemKey` preserves the account dropdown, live cart badge and non-navigating assistant behavior; `desktopVisible`/`mobileVisible` independently control rendering without changing the existing Header classes or global CSS.
- Public menu version `18` was published on `2026-07-22` with Vietnamese labels and canonical icons/routes. The pre-change draft snapshot is ignored at `web-admin/var/migrations/header-menu-utility-links/2026-07-22T07-45-12-678Z.json`; protected non-utility state hash `61da3466a4fcccdb4394f826825b2141f043e94091c21a37a1a8e59a12475f33` matched after replacement.
- `npm.cmd run header-utilities:publish` performs the identified-database check, snapshot, protected-area hash comparison, draft save, publish and public-contract verification. It requires `ADMIN_WRITE_ENABLED=true` and accepts only `it_tech_db`.

## PC Builder v6 (implemented and applied)

- Product create/edit now has an optional integer VND `Giá Build PC` field. Blank/`0` disables it; an active value must be greater than zero and below the catalog selling price. The value is stored transactionally in additive table `web_admin_pc_builder_product_prices`, audited with old/new values on basic-tab updates, and never exposed through ordinary cart/product pricing APIs.
- Quote eligibility is derived at runtime from every active component marked required and its `minSelections`; quantity does not inflate the distinct-SKU count. Incomplete builds use catalog/Flash Sale pricing and no Build PC campaign. Complete builds use a valid direct SKU Build PC price first, then the existing Build PC campaign only for SKUs without a direct price. Direct SKU price is deliberately authoritative even when Flash Sale is lower.
- Quote/candidate/order contracts now carry the conditional price, applied flag, `cartSubtotal`, `buildPriceEligible` and `buildPriceRevision`. Fingerprints include the final quantity-aware prices and this revision; order creation still re-quotes server-side. Ordinary cart handoff continues to use `cartPrice` and discards Build PC context.
- Fresh rollback boundary: `D:\web-tech\tmp\db-backups\it_tech_db-pre-pc-builder-v6-2026-07-19T22-00-14-364Z.json`, SHA-256 `afa5614534d2c13f799615dd3ac83d76bf5a169d4ec57eff09ea83e3d6d0041b`, verified at 308 tables/95,634 rows/one routine/two triggers. Clone `it_tech_db_backup_test_1784498414364_e3491c` passed `apply → apply → verify`; live apply/verify passed with one table/five columns/one index/no FK/no orphans.
- Verification completed: both app typechecks, quiet lints and production builds; 162/162 backend unit tests; 22 applied integration tests with 11 guarded skips; the guarded v6 price test passed on the retained clone; focused PC Builder Playwright passed 16/16 across desktop/mobile; and production-build local healthcheck passed 22/22 on isolated ports.

## PC Builder v5 (implemented and applied)

- Manual PC Builder now uses the dense dark table layout: component/category column, detailed selected-SKU rows, quantity stepper `1–4`, compact order summary below the table, five export/share/print actions, local responsive Build PC artwork, expandable introduction and six semantic FAQ items. The catalog-live candidate dialog and Header/Footer remain unchanged.
- Quote/order pricing supports additive Build PC promotions targeted by SKU or active category descendants, optional AND requirements by distinct component SKU count, fixed or percent discounts, percent rounding to 1.000đ, caps and deterministic lowest-price/priority/ID selection. Build PC and Flash Sale do not stack; the lower final price wins. Fingerprints include quantity and `promotionRevision`, and order metadata snapshots the final item prices/promotion data.
- Admin `/product/pc-builder` has a dedicated “Khuyến mãi Build PC” tab backed by optimistic, same-origin, RBAC/write-gated and audited `GET/PUT /api/admin/pc-builder/promotions`. Three additive InnoDB tables store promotion rules, logical SKU/category targets and component requirements.
- “Thêm vào giỏ hàng” batch-merges all quoted SKU quantities with one cart event and deliberately uses normal/Flash Sale cart prices, not Build PC prices. Direct checkout continues to re-quote and retain current Build PC promotion context. Excel is a real dynamically loaded `.xlsx`; PNG uses a branded dark canvas without remote images; print uses an isolated print-only sheet.
- Fresh rollback boundary: `D:\web-tech\tmp\db-backups\it_tech_db-pre-pc-builder-v5-2026-07-19T18-04-55-044Z.json`, SHA-256 `1f9843198e868117bf720dfe17bd836399d9e33a48abb97ee06563a69789c671`, verified at 305 tables/95,634 rows/one routine/two triggers. Clone `it_tech_db_backup_test_1784484295044_dba77f` passed apply twice and verify; live apply/verify then passed with 3 tables/3 FKs/4 indexes.
- Verification completed: both app typechecks/lints/builds, 161/161 backend unit tests, 21 applied integration tests with 10 guarded skips, focused PC Builder Playwright 14/14 across desktop/mobile (including XLSX/PNG/print), real catalog CPU count 112, real quantity-4 quote, and local healthcheck 22/22. Auto/release remains disabled.

## Quick tools — incomplete product attributes

- `web-admin` now exposes `/quick-tools` and `/quick-tools/incomplete-product-attributes` under `catalog.attributes.read`; checkbox autosave additionally requires `catalog.attributes.update`, same-origin admin session checks, and `ADMIN_WRITE_ENABLED=true`.
- The three-step dark UI selects an active category subtree, unions active category-attribute mappings without leaking an attribute into unrelated branches, and lists only distinct SKU/attribute pairs with no current assignment. Product sale visibility and price do not affect the default scope.
- Step 01 renders the active taxonomy as a guarded parent-child disclosure tree. It starts root-only, uses the admin sibling order (`ordering DESC`, Vietnamese name, ID), auto-opens the selected/search path, preserves manual expansion when search clears, and searches the one loaded category set locally by accent-insensitive name, breadcrumb, or ID. The category API exposes `parentId`/`ordering` and accepts `selectedCategoryId` so a completed selection and its ancestors remain addressable.
- `PUT /api/admin/quick-tools/incomplete-product-attributes/products/[productId]/values` replaces only one product/attribute value set. It locks the product row, validates mapping/value ownership, uses a SHA-256 selection revision for conflict/idempotency behavior, writes business audit metadata, and invalidates public product/detail/search/card/PC Builder consumers.
- This phase adds no table, index, migration, or public/storefront contract. The destructive integration fixture is guarded by `QUICK_ATTRIBUTE_DESTRUCTIVE_TEST=true` plus an explicitly disposable database name.
- Verification passed: both application typechecks, lints, and production builds; 155/155 backend unit tests; 20 applied integration tests with 9 guarded skips; `EXPLAIN ANALYZE` category summary completed in ~247 ms on the current catalog using the category/product-attribute indexes plus bounded temporary CTE sets; local two-server healthcheck passed 19/19. Browser autosave E2E still requires an authorized admin test session and a disposable write database.

## PC Builder Catalog-live v4 (implemented and applied)

- `pc-builder-v4-catalog-live` is the active Manual contract. Candidates come directly from active category roots/descendants plus `idv_sell_product_price.isOn=1 AND price>0`; there is no product-profile, extraction, review, source-hash or verified-only gate.
- Compatibility relations are bidirectional and compare raw `idv_product_attribute.attr_value_id` intersections. A relation is enforceable only when the reference attribute covers at least 90% of sellable SKUs in both active category trees; sparse configured relations remain visible in admin with their coverage but are skipped consistently by candidate, quote and order. Within an enforceable relation, missing reference attributes and mismatches are hard errors. Numeric metric rules are disabled and required component gaps remain confirmation warnings.
- Admin `/product/pc-builder` contains only dynamic category/relation management with searchable parent-child selectors and live sellable SKU counts. Storefront uses the dark full-viewport candidate dialog with SQL pagination, search/sort, price/brand/attribute-value facets, relation context, and SSD/HDD multi-select.
- The migration removed `web_admin_pc_builder_product_profiles`, `web_admin_pc_builder_product_metrics`, `profile_component_code`, and `profile_revision`; historical `storage` selections are normalized to SSD/HDD during requote without rewriting build/order rows. Benchmark snapshots and Gaming policy data remain independent; Auto/release endpoints return `503 PC_BUILDER_AUTO_DISABLED`.
- Storefront draft hydration is gated before `localStorage` persistence. Legacy `storage` selections are reconciled from the server quote into visible `ssd`/`hdd` selections and persisted canonically; quote state is keyed by selection signature/request generation so reset or rapid changes cannot restore stale item counts, prices or warnings. Checkout performs the same reconciliation before order submission.
- Restore-verified boundary: `D:\web-tech\tmp\db-backups\it_tech_db-pre-pc-builder-v4-rehearsal-2026-07-19T09-15-57-655Z.json`, SHA-256 `657d673b5e7e8b938c54d867e8c3f972b6a087255d73e8846f594872db4efb25`, 303 tables/97,581 rows/1 routine/2 triggers. Retained clone `it_tech_db_backup_test_1784452557655_209400` passed apply twice, verify and historical requote before the same apply-twice/verify sequence ran on `it_tech_db`.
- Current database inventory is 301 tables (173 InnoDB/128 MyISAM), including nine PC Builder tables. Verification: 150 backend unit tests, 19 applied integration tests (8 guarded/skipped), both app typechecks/lints/builds, 10/10 focused PC Builder Playwright cases across desktop/mobile, and 19/19 two-server health checks.

## PC Builder historical v2/v3 rollout (superseded by v4)

- Dedicated revision `pc-builder-v2` passed clone apply/idempotency/hard rollback/reapply, then applied twice and verified on live `it_tech_db`. Live now has 302 tables (174 InnoDB/128 MyISAM), including ten InnoDB/`utf8mb4_unicode_ci` PC Builder tables and `order_type=standard|combo|pc_builder`.
- Restore-verified boundary: `D:\web-tech\tmp\db-backups\it_tech_db-pre-pc-builder-live-20260719003737.sql`, SHA-256 `f5f66f6c9916e0f995ba4b22c918188bd74a76e07cbe61f38a82feee1fb5db57`; retained clone `it_tech_db_pc_builder_clone_20260719003737`.
- The former curated manifest/profile gate and its hashes are historical only; v4 removed those tables and flows.
- Manual remains live (`PC_BUILDER_ENABLED=true`). Auto remains off (`PC_BUILDER_AUTO_ENABLED=false`) and its API is explicitly unavailable until a later phase.
- Live QA retained standard order `#20` and PC Builder order `#21`, both status `3`; confirmation and completed events for both are `sent`. QA account `tiendinh.ntd+qa@gmail.com` has no live session and must change its temporary password. Its one-time credential artifact is outside Git at `D:\web-tech-backups\pc-builder-qa-live-20260719.json`.
- Local testing runtime currently has `ADMIN_WRITE_ENABLED=true`, `PC_BUILDER_ENABLED=true`, and `PC_BUILDER_AUTO_ENABLED=false`; both production servers were rebuilt/restarted after v4 cutover. Return the write gate to `false` after configuration testing. `RECAPTCHA_DEVELOPMENT_BYPASS=false`; `hanoi23_db` was not read or modified during rollout.

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
- The reviewed 2026-07-22 component/homepage bundle is committed to `main` and synchronized with `origin/main`; use `git rev-parse HEAD` for the immutable commit ID.
- The working tree was clean after the GitHub synchronization. Inspect `git status --short` before any later edit and preserve any new user changes.
- Never reset, discard, or overwrite the working tree. Inspect `git status --short` and relevant diffs before editing.
- A fresh clone of `main` contains the reviewed feature bundle. Follow `NEW_MACHINE_SETUP.md` and the database-transfer guide before moving machines.
- `search-tool` is a historical Git link/reference, not the production search implementation. It has no committed `.gitmodules` entry and must not be treated as a required runtime dependency.

## Ownership and runtime boundaries

- The canonical public project brand is exactly `TrucTiepGAME`. User-facing copy, metadata, fallbacks, and future UI work must not reintroduce the legacy Evetech name.
- `web-admin` owns the admin UI, all public/admin/customer APIs, MySQL access, migrations/importers, uploaded-media serving, and the background worker.
- `font-end` owns the customer storefront. It consumes `web-admin` APIs and must never import a database client or receive database credentials.
- `search-tool` is historical only. Production search is in `web-admin`.
- Uploaded media lives under the external `MEDIA_ROOT` and is served by `web-admin /api/media/[...path]`.
- Local topology: `web-admin :3000`, `font-end :3001`, plus one background-worker process. The supplied production topology uses Caddy, two clustered API workers, one storefront worker, and one background worker.

## Current uncommitted feature bundle

The current working tree implements and documents the following related changes:

- Banner-location management now has a permanent-delete flow guarded by `marketing.banner_locations.delete`: the service locks the target/default rows, moves every owned banner to the protected `unassigned` location, synchronizes denormalized location fields, hides the banners, deletes only the location, clears public caches after commit and writes a business audit event. The shared confirmation dialog now traps/restores focus, closes on Escape and passes focused Axe coverage; the default location permits name/description edits only and is never returned by public banner APIs.
- Dedicated revision `banner-location-unassigned-v1` added unique key `uk_idv_seller_ad_location_index_key` and seeded singleton `unassigned` / `Chưa có vị trí` without altering legacy zero-date defaults. Restore-verified backup `D:\web-tech\tmp\db-backups\it_tech_db-pre-banner-location-delete-2026-07-20T23-33-38-115Z.json` has SHA-256 `5b4766950114b2722303c7695253201be28e4c6f33df708b3e1bf60671d93e3b`, 309 tables/97,120 rows/one routine/two triggers. Retained clone `it_tech_db_backup_test_1784590418116_8630bd` passed apply twice, verify, hard rollback, reapply twice, concurrency integration and real admin Playwright before live apply-twice/verify created default location ID `88`; live has no duplicate keys or orphan banners and `ADMIN_WRITE_ENABLED=false`.
- Homepage Section 2 now renders the managed `circleStory` bootstrap payload as a self-contained responsive story rail without the legacy `.story-*` selectors or IDs. Each circle has a measured three-layer treatment: 3px gradient ring, 3px dark spacer and artwork beginning at a 6px inset. The 397px layout uses 73px rings on an 81px step, showing four complete items plus most of the fifth; the 2542px layout centers fourteen 96px rings with 32px gaps inside a 1920px rail. The shared mobile-only controller supplies three-second autoplay, drag/click suppression, lifecycle pause and reduced-motion native scrolling without a client component or another request.
- Homepage Section 3 now consumes the managed `slide_home` banners directly from the existing homepage bootstrap and renders the compact art-directed hero without shared legacy hero CSS. A centered 1920px rail yields an 1856×381px desktop banner with a 96px overlay inset; the 401px layout uses the configured 1024×397 mobile artwork in a 369×143px frame with a 24px inset. Indicators start at 640px, navigation remains keyboard/swipe/autoplay capable, and focus/visibility/reduced-motion lifecycle coverage is included without hardcoded Evetech content.
- Homepage Section 4 now renders the managed `shopByCategory` payload as the compact reference carousel without hardcoded Evetech content. A centered 1920px desktop rail uses 130×110px cards on a 154px step; the 398px mobile layout uses 90×95px cards on a 100px step, showing three full cards plus most of the fourth. The shared homepage controller retains autoplay/drag/pause/reduced-motion behavior, while the card links, media, badges, colors and targets remain web-admin managed.
- Homepage Section 5 now uses five local AVIF deal artworks in a self-contained Server Component instead of shared `.featured-grid`, `.category-card`, `.card-*`, `.cta-btn` and placeholder styling. Desktop uses the reference centered 1800px three-column grid with the Pre-built card spanning both rows; mobile uses the reference two-column asymmetric layout. All cards have canonical storefront routes, native keyboard focus, reduced-motion-safe interactions and focused geometry/accessibility coverage.
- Homepage Section 9 now uses five local AVIF category artworks in a self-contained server component instead of shared `.promo-card` CSS and faux shapes. At 1500px and above it renders one centered five-card 5:6 row capped at 1700px with 30px gaps; mobile uses the reference two-wide / three-wide 6-column composition, with three-column tablet layouts between. All cards have canonical storefront search links, keyboard focus, reduced-motion-safe hover treatment, responsive `next/image` sizing, and focused geometry/accessibility coverage.
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
- Homepage Section 8 uses collection `896` / `goi-y-cho-ban` from the existing server bootstrap and remains server-rendered. Its ten carousel items now render the same shared `ProductGridCard` used by Section 11 and collection detail, including canonical square media, discount/market pricing, stock state, product navigation and the cart action; 280px desktop items retain the full card density and 180px mobile items use the existing compact container-query presentation. Its header exposes matching accessible previous/next arrow controls beside the collection link. The homepage-only raw JavaScript controller initializes every `.carousel-track` except the hero plus opt-in Section 11 mobile tracks with a one-card buffer, optional clones, three-second auto-slide, mouse/touch drag, focus/hover/visibility pause, reduced-motion gating, indicators, resize recalculation, and a Next.js init/destroy adapter that prevents duplicate timers/listeners across route mounts. Track drag suppresses only the click synthesized by actual pointer movement, while normal clicks and keyboard actions remain unchanged.
- Homepage Section 10 remains implemented with category `521` and its shared-card variant but is temporarily not imported/rendered and its category is excluded from bootstrap/fallback loading. Section 6 is likewise dormant; Section 17 remains the only active consumer of the shared homepage-product-section pipeline.
- Storefront collection detail is server-first: it shows the collection name as a visible H1 before the sanitized database `description`, then repeats the name in a gradient catalog H2 with the solid product count. It preserves safe description classes and inline styles, exposes only the two URL-driven price sort links, fixes page size at 24, and uses canonical Link pagination. Collection detail and homepage Sections 8, 10 and 11 now render the same `ProductGridCard` markup. The card uses a 260px CSS-container threshold to preserve the full presentation when space permits and automatically reduce density below it; narrow cards retain the stock dot and screen-reader label while hiding only the visible stock text.
- Homepage Section 11 category-feature sections load at most nine distinct sellable products from each enabled category and all enabled descendants, ordered by `idv_sell_product_price.ordering DESC, product.id DESC`. Below 640px each block removes its outer frame/padding and uses one 130px compact hero, one category/action row and a ~1.8-card carousel of unchanged `ProductGridCard` instances. The shared homepage controller progressively enhances that track with a seamless three-second transform autoplay and the existing 20% drag threshold; it pauses offscreen, while focused, or when the tab is hidden, and leaves native snap scrolling in place for no-JavaScript/reduced-motion users. At `sm` the controller restores DOM/inline state and the prior two/three-column grid returns; `xl` retains a three-column hero opposite three products and six products below with `boxPosition` honored. The hero CTA is mobile-hidden. Category-page behavior and backend contracts remain unchanged.
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
- Accepted schema: 301 physical tables, 173 InnoDB and 128 MyISAM, 1 routine, 2 triggers, zero Latin-1/utf8mb3 columns, and zero importer recovery/stage/restore tables. All nine PC Builder tables are InnoDB/`utf8mb4_unicode_ci`.
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

## Flash Sale implementation pending rollout

- Code now includes additive campaign/item/allocation/buyer-usage schema ownership in `web-admin`, a guarded `flash-sale:migrate` command, admin Campaign Studio/list APIs and RBAC, public feed/product projection, cart/order re-quote, atomic reserve/consume/release transitions, and the dark `/flash-sale` storefront with colored remaining-quota bars.
- Flash Sale schema was applied to identified database `it_tech_db` on `2026-07-19` after a fresh logical backup/restore verification (SHA-256 `72063f78d1562e078ff71822f3006c80ee3155dba2afecf4c1cc3a0f03d04223`). Guarded apply passed twice and verify confirmed 4 InnoDB tables, 4 foreign keys, quota/index contracts and system-role permissions. `FLASH_SALES_ENABLED=true`; all Flash Sale tables currently contain zero business rows.
- Promotional quota is independent of legacy physical stock. `idv_sell_product_price.quantity=-1` remains untouched. Raw guest phone values are not stored in the Flash Sale usage table; an HMAC buyer key is used instead.
- Current Flash Sale implementation verification: both application TypeScript and quiet ESLint pass; both production builds pass; backend unit suite is 160/160; integration suite is 20 pass with 10 expected safety/fixture skips (including the destructive Flash Sale concurrency fixture); focused desktop/mobile Flash Sale Playwright is 2/2. Local healthcheck now includes public API, admin page and storefront Flash Sale probes and passes 22/22. After migration, the admin list query returns an empty valid result, public Flash Sale API returns `enabled=true` with zero campaigns, `/flash-sale` returns 200 with the dark shell, and anonymous admin API access returns 401.

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
