# Changelog

Notable workspace changes are grouped by implementation/audit date.

## 2026-07-09

### Changed

- Enabled vertical resize for the article category detail editor in `web-admin`.
- Documented the admin UI rule that long-form `RichTextEditor` fields should use the `resizable` prop and vertical-only TinyMCE resizing.

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
