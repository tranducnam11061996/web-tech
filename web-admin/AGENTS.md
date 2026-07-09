<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version may differ from the model's training data. Read relevant local Next.js docs and existing project patterns before changing framework behavior.
<!-- END:nextjs-agent-rules -->

## Runtime Architecture

- This app uses Next.js `16.2.9` and is both the admin UI and REST backend.
- It is the only app allowed to connect to MySQL.
- Prefer `DATABASE_URL`; never add direct DB access to `font-end`.
- Storefront APIs live under `src/app/api` and must preserve public response contracts.
- Product price/status must be re-read from DB before order creation.
- New order logic must use a transaction and share quote logic from `src/lib/cart-quote.ts`.

## Current Handoff Docs

Before major changes, read:

- `D:\web-tech\AI_HANDOFF.md`
- `D:\web-tech\ARCHITECTURE.md`
- `D:\web-tech\PROJECT_PROGRESS.md`
- `D:\web-tech\web-admin\database-docs\DATABASE_SCHEMA.md`
- `D:\web-tech\web-admin\database-docs\ADMIN_MIGRATION_GUIDE.md`

## Database And Migration Rules

- Admin writes require `ADMIN_WRITE_ENABLED=true`.
- Do not bypass the admin write gate for UI/API mutations.
- `product_data_search` is live and synced by DB function/triggers plus rebuild scripts.
- `admin:migrate` now creates/updates helper tables for product images, menu drafts, banner metadata, product-card badge rules, and category first boxes.
- Required helper tables for current admin features: `web_admin_product_images`, `web_admin_menus`, `web_admin_menu_versions`, `web_admin_menu_items`, `web_admin_banner_meta`, `web_admin_product_card_attribute_rules`, `web_admin_category_feature_boxes`.
- No latest feature intentionally adds columns to legacy tables; new metadata should live in `web_admin_*` helper tables unless explicitly planned otherwise.
- Keep legacy product image fields synced until all consumers stop reading `proThum`, `image_collection`, and `image_count`.

## API Safety

- Validate request types and ranges; do not silently coerce invalid commerce input.
- Do not return raw SQL/DB errors in production responses.
- Keep CORS headers consistent, but use an origin allowlist in production.
- Public write endpoints need rate limiting, idempotency, and abuse protection.
- Use `Promise.all` for independent queries and keep count queries minimal.

## Search Rules

- Public search should use `product_data_search`.
- Search owner files:
  - `src/lib/searchInfrastructure.ts`
  - `src/lib/searchCache.ts`
  - `src/lib/productSearch.ts`
  - `src/app/api/search/route.ts`
  - `src/app/api/webhook/update-search/route.ts`
- Use `npm.cmd run search:rebuild` to refresh rows.
- Use `npm.cmd run search:migrate` only when intentionally recreating table/function/triggers.

## Product Image Album Rules

- Valid image types are `product`, `self`, and `customer`.
- Storefront product tab contains `product + self`.
- Storefront customer tab contains only `customer`.
- Uploaded files must stay under `MEDIA_ROOT`.
- Do not delete physical files unless the resolved path is inside `MEDIA_ROOT`.

## TinyMCE Loading

- Do not add TinyMCE back to `src/app/layout.tsx`.
- Load `/tinymce.min.js` only from `RichTextEditor` via `next/script`.
- Keep all TinyMCE assets local under `public/`; no CDN/cloud dependency.

## Admin UI Guidelines

- Do not include top breadcrumbs unless specifically requested.
- Do not add warning banners unless specifically requested.
- All user-facing warning text, instructional text, and button labels must use proper Vietnamese with diacritics when displayed in the admin UI.
- Use the full workspace width; avoid unnecessary `max-width` wrappers on admin work screens.
- Keep outer workspace padding compact.
- Edit/create screens should prioritize readability: use larger labels, taller form controls, clearer spacing, and comfortable multi-column layouts on desktop while collapsing cleanly on mobile.
- Use `RichTextEditor` only for primary rich content fields. Use normal inputs/textareas for SEO metadata, keywords, and simple descriptions.
- Every admin `RichTextEditor` used for long-form content should enable vertical resizing with the `resizable` prop so users can expand/collapse editor height without changing layout width.
- Keep the existing dark tech visual style unless the task explicitly asks for redesign.

## Reusable Modules

- Product search action: `src/actions/product.ts`
- Shared pagination: `src/components/shared/Pagination.tsx`
- Product selection modal: `src/components/shared/ProductSelectModal.tsx`

Reuse these modules instead of creating duplicate implementations.
