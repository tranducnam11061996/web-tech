# HACOM Backend API and Admin Dashboard

Last audited: 2026-07-07

`web-admin` is the only app that connects directly to MySQL. It serves internal admin screens and public API routes consumed by the storefront.

## Responsibilities

- Connect to MySQL through `src/lib/db.ts`.
- Serve admin dashboard pages.
- Serve storefront APIs.
- Own product/category/news/order read and write logic.
- Own search cache infrastructure through `product_data_search`.
- Own uploaded product media through `MEDIA_ROOT` and `/api/media`.
- Keep legacy product fields working while new admin features are added.

## Environment

`src/lib/db.ts` resolves database config in this order:

1. `DATABASE_URL`
2. `DATABASE_URL` from app/workspace env files
3. `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

Example:

```env
DATABASE_URL="mysql://user:password@127.0.0.1:3306/web_tech"
```

Admin writes are disabled unless explicitly enabled:

```env
ADMIN_WRITE_ENABLED=true
ADMIN_DRY_RUN=false
```

Product image upload/media config:

```env
MEDIA_ROOT=D:\web-tech\media
MEDIA_BASE_URL=/api/media
```

Storefront URL config:

```env
STOREFRONT_URL=http://localhost:3001
NEXT_PUBLIC_STOREFRONT_URL=http://localhost:3001
```

## Commands

```powershell
npm.cmd install
npm.cmd run dev
npx.cmd tsc --noEmit
$env:NODE_OPTIONS='--max-old-space-size=4096'
npm.cmd run build
```

Known checks:

- Typecheck passed on 2026-07-07.
- Build passed on 2026-07-07 with increased Node memory.
- Lint is not clean because of legacy issues.

## Storefront APIs

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/products/[slug]` | `GET` | Resolve product or category slug |
| `/api/products` | `GET` | Product list, pagination, filters, sorting |
| `/api/categories` | `GET` | Category tree/subcategories |
| `/api/categories/price-bounds` | `GET` | Category min/max price |
| `/api/categories/attributes` | `GET` | Attribute and brand filters |
| `/api/search` | `GET` | Search products using `product_data_search` |
| `/api/cart/quote` | `GET`, `POST`, `OPTIONS` | Validate cart items against DB |
| `/api/orders` | `GET`, `POST`, `OPTIONS` | Create order transaction |
| `/api/news/[slug]` | `GET` | Article detail |
| `/api/news-category/[slug]` | `GET` | News category |
| `/api/media/[...path]` | `GET` | Serve uploaded media from `MEDIA_ROOT` |

## Admin APIs

Admin write endpoints are same-origin and require `ADMIN_WRITE_ENABLED=true`.

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/admin/products` | `GET`, `POST` | List/create products, bulk actions |
| `/api/admin/products/[id]` | `GET`, `PATCH`, `DELETE` | Read/update/hide or delete product |
| `/api/admin/products/[id]/images` | `GET`, `PATCH` | List grouped images, save metadata batch |
| `/api/admin/products/[id]/images/upload` | `POST` | Upload product image files |
| `/api/admin/products/[id]/images/[imageId]` | `DELETE` | Delete image metadata and owned file |
| `/api/admin/product-categories` | `GET`, `POST` | List/create product categories |
| `/api/admin/product-categories/[id]` | `GET`, `PATCH`, `DELETE` | Read/update/hide or delete category |
| `/api/admin/articles` | `GET`, `POST` | List/create articles |
| `/api/admin/articles/[id]` | `GET`, `PATCH`, `DELETE` | Read/update/hide or delete article |
| `/api/admin/article-categories` | `GET`, `POST` | List/create article categories |
| `/api/admin/article-categories/[id]` | `GET`, `PATCH`, `DELETE` | Read/update/hide or delete article category |
| `/api/admin/migrate` | `POST` | Create admin helper tables when writes are enabled |

## Search

Current production-facing search uses the `product_data_search` table.

Key files:

- `src/lib/searchInfrastructure.ts`
- `src/lib/searchCache.ts`
- `src/lib/productSearch.ts`
- `src/app/api/search/route.ts`
- `src/app/api/webhook/update-search/route.ts`
- `scripts/run-search-migration.ts`
- `scripts/rebuild-search-data.ts`

Audited state on 2026-07-07:

- `product_data_search`: 28,763 rows.
- Missing product search rows: 0.
- Normalize function, insert trigger, update trigger, and FK are present.

Useful commands:

```powershell
npm.cmd run search:migrate
npm.cmd run search:rebuild
```

Run `search:migrate` only when you intentionally want to recreate the search infrastructure.

## Product Image Albums

Admin product edit now supports album/type metadata in code:

| Type | Meaning | Storefront group |
| --- | --- | --- |
| `product` | Product image | `imageGroups.product` |
| `self` | Hacom/self-shot image | `imageGroups.product` |
| `customer` | Customer image | `imageGroups.customer` |

The intended table is `web_admin_product_images`. It was not present in the live DB at the 2026-07-07 audit, so run admin migration before relying on upload in a shared environment.

Admin migration:

```powershell
$env:ADMIN_WRITE_ENABLED='true'
$env:ADMIN_DRY_RUN='false'
npm.cmd run admin:migrate
```

Uploaded files are stored under:

```text
MEDIA_ROOT\ddMMyyyy\filename
```

After image changes, code syncs back to legacy product fields:

- `proThum`
- `image_collection`
- `image_count`

## Admin Editor Guidelines

- Use `RichTextEditor` for long-form rich content only.
- Pass `resizable` to long-form admin editors so users can drag the TinyMCE status bar to expand/collapse height.
- Keep resizing vertical only; do not introduce horizontal editor resizing on admin forms.

## Quote and Order

Shared quote logic lives in `src/lib/cart-quote.ts`.

Current behavior:

- Deduplicates cart items by `productId`.
- Queries product, price, and URL data from DB.
- Treats a product as available when `isOn = 1` and price is greater than 0.
- Calculates line totals and cart totals from DB data.
- `POST /api/orders` re-quotes before inserting `build_buy` and `build_buy_item`.

Production hardening still needed:

- Rate limit and anti-spam.
- Strict CORS allowlist.
- Stronger backend validation.
- Idempotency key.
- Safer public error responses.

## Documentation

Read these before modifying database-facing behavior:

- `..\AI_HANDOFF.md`
- `..\ARCHITECTURE.md`
- `database-docs\DATABASE_SCHEMA.md`
- `database-docs\QUICK_REFERENCE.md`
- `database-docs\STATISTICS.md`
- `database-docs\ADMIN_MIGRATION_GUIDE.md`
