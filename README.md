# HACOM E-commerce Workspace

Last audited: `2026-07-09`

This workspace contains the storefront, admin dashboard, REST backend, search prototype, and runtime database documentation for the HACOM e-commerce rebuild.

Start here, then read `AI_HANDOFF.md`, `ARCHITECTURE.md`, `PROJECT_PROGRESS.md`, and the files under `web-admin/database-docs/`.

## Apps

| Path | Role | Stack | Default port |
|---|---|---|---:|
| `web-admin` | Admin dashboard and all REST APIs | Next.js 16.2.9, React 19.2, Tailwind CSS 4, MySQL2 | 3000 |
| `font-end` | Customer storefront | Next.js 15, React 19, Tailwind CSS 3 | 3001 |
| `search-tool` | Older standalone search prototype/reference | Next.js/Node prototype | varies |
| `web-admin/database-docs` | Live DB schema and migration notes | Markdown | - |

`font-end` must not connect to MySQL directly. All dynamic storefront data goes through `web-admin`.

## Local Run

```powershell
cd D:\web-tech\web-admin
npm.cmd install
npm.cmd run dev
```

```powershell
cd D:\web-tech\font-end
npm.cmd install
npm.cmd run dev
```

URLs:

- Admin/API: `http://localhost:3000`
- Storefront: `http://localhost:3001`

## Environment

`web-admin/src/lib/db.ts` reads `DATABASE_URL` from `process.env`, `web-admin/.env.local`, app `.env`, or parent workspace `.env`.

Important variables:

```env
DATABASE_URL="mysql://user:password@127.0.0.1:3306/hanoi23_db"
NEXT_PUBLIC_API_URL="http://localhost:3000"
STOREFRONT_URL="http://localhost:3001"
ADMIN_WRITE_ENABLED=false
MEDIA_ROOT="D:\\web-tech\\media"
MEDIA_BASE_URL="/api/media"
```

Writes are intentionally gated. Do not set `ADMIN_WRITE_ENABLED=true` unless you are using a safe development/staging DB.

## Current Feature State

- Product/category slug gateway through `GET /api/products/[slug]`.
- Category listing, filters, price bounds, sort, pagination, and SSR initial data.
- Guest cart in localStorage key `hacom.cart.v1`.
- Cart quote and order creation validate price/status on backend.
- Admin CRUD for products, product categories, articles, and article categories.
- In-memory product search API backed by `product_data_search`, Fuse.js, synonyms, and dynamic facets.
- Product image upload/album code is implemented, but the new image metadata table is not present in the live DB until admin migration runs.
- Managed header/homepage menu data is implemented with split public APIs: `/api/menu/header` and `/api/menu/homepage`.
- Banner carousel management is implemented with legacy banner tables plus `web_admin_banner_meta`.
- Product card attribute badges are implemented with `web_admin_product_card_attribute_rules` and public `cardBadges`.
- Category first-box layout is implemented with `web_admin_category_feature_boxes` and renders on homepage/category pages when enabled.

Run admin migration on a safe DB before using the newest admin screens:

```powershell
cd D:\web-tech\web-admin
$env:ADMIN_WRITE_ENABLED="true"
npm.cmd run admin:migrate
```

## Verification Notes

Most recent code checks:

- `web-admin`: `npx.cmd tsc --noEmit` pass.
- `font-end`: `npx.cmd tsc --noEmit` pass.
- `web-admin`: build passes with `NODE_OPTIONS=--max-old-space-size=4096`.
- `font-end`: build passes with `NODE_OPTIONS=--max-old-space-size=4096`.
- `npm.cmd run lint` in `web-admin` still reports pre-existing legacy lint errors outside the latest feature work.
- `npm.cmd run lint` in `font-end` prompts for ESLint setup because that app has no committed ESLint config.

## Documentation Map

- `AI_HANDOFF.md`: concise handoff for the next AI/engineer.
- `ARCHITECTURE.md`: app boundaries, major flows, APIs, search, product images.
- `PROJECT_PROGRESS.md`: completion status, risks, backlog.
- `CHANGELOG.md`: dated change history.
- `web-admin/README.md`: backend/admin API details and operational commands.
- `font-end/README.md`: storefront routes/components/data flow.
- `web-admin/database-docs/DATABASE_SCHEMA.md`: live DB schema reference.
- `web-admin/database-docs/QUICK_REFERENCE.md`: query snippets and table relationships.
- `web-admin/database-docs/ADMIN_MIGRATION_GUIDE.md`: safe migration instructions.
- `web-admin/database-docs/STATISTICS.md`: live table counts and observations.
