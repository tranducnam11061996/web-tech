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
- `web_admin_product_images` is implemented in code but was not present in live DB at the 2026-07-07 audit; run `admin:migrate` with writes enabled before relying on it.
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
- Use the full workspace width; avoid unnecessary `max-width` wrappers on admin work screens.
- Keep outer workspace padding compact.
- Use `RichTextEditor` only for primary rich content fields. Use normal inputs/textareas for SEO metadata, keywords, and simple descriptions.
- Keep the existing dark tech visual style unless the task explicitly asks for redesign.

## Reusable Modules

- Product search action: `src/actions/product.ts`
- Shared pagination: `src/components/shared/Pagination.tsx`
- Product selection modal: `src/components/shared/ProductSelectModal.tsx`

Reuse these modules instead of creating duplicate implementations.
