# AI Handoff - HACOM Workspace

Last audited: `2026-07-09`

Read this file first. It is written for another AI or engineer who needs to continue coding immediately.

## What This Repo Is

`web-admin` is both the admin UI and the only backend allowed to access MySQL `hanoi23_db`.

`font-end` is the customer storefront. It must call `web-admin` APIs and must not import DB clients or read DB credentials.

`search-tool` is an older standalone search prototype. The production-ish search code now lives in `web-admin/src/lib/searchCache.ts`, `web-admin/src/lib/productSearch.ts`, and `web-admin/src/lib/searchInfrastructure.ts`.

## Must-Read Files

1. `README.md`
2. `ARCHITECTURE.md`
3. `PROJECT_PROGRESS.md`
4. `web-admin/AGENTS.md`
5. `web-admin/README.md`
6. `font-end/README.md`
7. `web-admin/database-docs/DATABASE_SCHEMA.md`
8. `web-admin/database-docs/QUICK_REFERENCE.md`
9. `web-admin/database-docs/ADMIN_MIGRATION_GUIDE.md`

## Database Snapshot

Live DB at audit time:

- Database: `hanoi23_db`
- Total tables: `244`
- InnoDB tables: `116`
- MyISAM tables: `128`
- `latin1_swedish_ci` tables: `243`
- `product_data_search` is `utf8mb4_unicode_ci`

Important custom/runtime tables:

- `product_data_search`: exists, exact count `28,763`, PK `product_id`, FK to `idv_sell_product_store(id)`.
- `web_admin_sequence`: exists, one row `product -> next_id 90788`.
- `web_admin_entity_registry`: exists, currently empty.
- `web_admin_product_images`: code exists but live table was not present during audit because admin migration is gated by `ADMIN_WRITE_ENABLED`.

Search infrastructure also has:

- Function `webtech_normalize_product_search`.
- Trigger `webtech_product_search_after_insert` on `idv_sell_product_store`.
- Trigger `webtech_product_search_after_update` on `idv_sell_product_store`.
- FK `fk_product_data_search_product`.

## Current Major Features

### Storefront

- `font-end/src/app/[slug]/page.tsx` resolves product/category slugs through `web-admin /api/products/[slug]`.
- Category pages load initial products, subcategories, price bounds, and attributes server-side.
- Cart is guest-only and stored under localStorage key `hacom.cart.v1`.
- Checkout calls backend quote and order APIs; client prices are display cache only.
- Product detail carousel now supports image tabs from `productData.imageGroups`.
- Header navigation now loads menu data from `web-admin /api/menu/header` with a local fallback.
- Homepage sections should bind dynamic data into their existing markup instead of creating duplicate display areas. Current example: `Circle Story` data comes from `/api/menu/header` and renders only in `font-end/src/components/sections/Section2.tsx`, not in `Header`.
- Header menu labels default to Vietnamese `Danh Mục` and `Nổi bật`; the frontend repairs known mojibake strings and renders header chrome icons with `lucide-react` SVG icons.

### Backend/Admin

- `web-admin/src/lib/db.ts` is the only DB connector.
- Admin writes require `ADMIN_WRITE_ENABLED=true`.
- Admin product save intentionally preserves existing image fields unless `payload.images` is explicitly provided.
- Admin product image upload code stores files under `MEDIA_ROOT/ddMMyyyy/file.ext`, exposed through `/api/media/[...path]`.
- Product image albums/types are `product`, `self`, `customer`.
- Storefront should show `product + self` as product images and `customer` as customer images.
- Header menu manager exists at `/content/menu` in `web-admin`.
- Header menu data uses draft/published versions with `web_admin_menus`, `web_admin_menu_versions`, and `web_admin_menu_items`; version settings store editable frontend labels for `Danh Mục` and `Nổi bật`.
- Admin menu UI supports area switching, live preview, expanded/collapsed tree management, quick custom-link input, draft save, publish, and link target search.
- Public header menu output repairs known mojibake suffix/label values before returning data to the storefront.

### Search

- Main endpoint: `GET /api/search?q=&page=&limit=&sort=`.
- Cache TTL is 60 seconds.
- Fuse indexes are rebuilt when the cache refreshes or receives a webhook mutation.
- Search joins `product_data_search`, product price, URL, brand, and product attributes.
- Synonym groups live in `web-admin/src/lib/searchCache.ts`.
- Exclusion rules live in `web-admin/src/lib/productSearch.ts`.
- Rebuild search DB data with `npm.cmd run search:rebuild`.
- Recreate function/table/triggers with `npm.cmd run search:migrate`.

## Migration Rules

Run admin helper migrations only on safe DBs:

```powershell
cd D:\web-tech\web-admin
$env:ADMIN_WRITE_ENABLED="true"
npm.cmd run admin:migrate
```

Run search infrastructure migration:

```powershell
cd D:\web-tech\web-admin
npm.cmd run search:migrate
```

Search migration drops/recreates the search triggers and function, then rebuilds `product_data_search`.

## Verification Commands

Use `npm.cmd`, not bare `npm`, in PowerShell.

```powershell
cd D:\web-tech\web-admin
npx.cmd tsc --noEmit
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm.cmd run build
```

```powershell
cd D:\web-tech\font-end
npx.cmd tsc --noEmit
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm.cmd run build
```

Known verification caveats:

- `web-admin` lint currently fails on legacy `.cjs` scripts and a few existing React/lint findings.
- `font-end` lint prompts to configure ESLint.
- Build can run out of memory without `NODE_OPTIONS=--max-old-space-size=4096`.

## Do Not Break These

- Do not add DB access to `font-end`.
- Do not load TinyMCE in `web-admin/src/app/layout.tsx`; keep it inside `RichTextEditor`.
- For admin long-form content fields that use `RichTextEditor`, pass `resizable` so TinyMCE can be resized vertically from the status bar. Keep horizontal resizing disabled.
- Do not permanently delete legacy entities unless they are recorded in `web_admin_entity_registry`.
- Do not replace `product_data_search` without preserving triggers/function/FK behavior.
- Do not assume physical foreign keys exist across legacy tables.
- Do not commit `.env` or local generated caches.
- Do not treat `tmp/` as source; it is currently untracked workspace output.
- Do not render homepage section data in a second component when the section already owns the markup. For `Section*.tsx`, keep existing HTML/class/id structure and only loop/bind data into existing tags unless a task explicitly requests new markup or CSS.

## High-Priority Next Work

- Smoke-test `/content/menu` against the live dev DB after running admin migrations with `ADMIN_WRITE_ENABLED=true`, then publish a menu and verify `font-end` at `localhost:3001`.
- Add auth/authorization for admin write APIs.
- Add production CORS allowlist and rate limiting for public write endpoints.
- Run `admin:migrate` with writes enabled to create `web_admin_product_images`, then smoke-test image upload UI.
- Add filters in admin product list for missing `self` images and missing `customer` images.
- Add integration tests for quote/order and image upload/delete metadata sync.
- Decide whether to keep or delete legacy scratch files at repo root.

