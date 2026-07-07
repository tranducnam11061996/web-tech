# HACOM Storefront

Last audited: 2026-07-07

`font-end` is the customer-facing storefront. It must not connect directly to MySQL. All dynamic data should come from `web-admin` APIs.

## Responsibilities

- Render customer product/category/news pages.
- Own cart and checkout UI state.
- Call backend APIs through `NEXT_PUBLIC_API_URL` or configured rewrites.
- Keep UI behavior in React state instead of legacy global scripts.
- Display product detail images using backend `imageGroups` when available.

## Environment

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

The app currently has a Next rewrite for `/api/:path*` to the local backend, so client code can also call same-origin `/api/...` where appropriate.

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
- Lint is not configured; Next.js prompts for setup.

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Home shell |
| `/[slug]` | Product/category dynamic gateway |
| `/category` | Category by query id |
| `/tim` | Search page |
| `/gio-hang` | Guest cart |
| `/thanh-toan` | Checkout |
| `/tin-tuc` | News landing |
| `/tin-tuc/[slug]` | News article/category |

## Dynamic Slug Flow

`app/[slug]/page.tsx` calls:

```text
GET http://localhost:3000/api/products/{slug}
```

If the response is a category, the server fetches initial data from:

- `/api/products?category_id=...`
- `/api/categories?parentId=...`
- `/api/categories/price-bounds?categoryId=...`
- `/api/categories/attributes?categoryId=...`

After hydration, `CategoryClient` refetches product lists when page, filter, price, or sort changes.

## Product Detail Images

`ProductCarousel` should prefer the new grouped payload from `/api/products/[slug]`:

```ts
imageGroups.product   // product + self images
imageGroups.customer  // customer images
```

Fallback behavior still supports legacy flat image arrays so old products keep rendering.

UI rules:

- Default to product images.
- Customer tab uses only `customer` type images.
- Hide or lightly disable the customer tab when no customer images exist.
- Do not change the wider product detail style unless the task explicitly asks for it.

## Cart

Storage key:

```text
hacom.cart.v1
```

Cart supports:

- Merge duplicate `productId`.
- Quantity `1..99` on the client.
- Selected items and select all.
- Remove selected.
- Save for later and restore.
- Header badge for active quantity.
- Reload persistence.

Local cart price is not trusted. Cart and checkout call `POST /api/cart/quote`; order creation re-quotes on the backend.

## Component Notes

`ProgressiveImage`:

- Caches SVG placeholders.
- Uses native lazy loading.
- Keeps placeholder if image loading fails.

`ProductCarousel`:

- Custom carousel, no Swiper.
- Uses refs for drag delta.
- Stops timer when document tab is hidden.
- Reads grouped images when supplied.

`Header`:

- Uses `src/components/menuData.ts`.
- Desktop/mobile menu are React-driven.
- Does not depend on `public/main.js`.

## Minimum Manual Checks

- `/laptop`: load, filter, sort, pagination, quick filter search.
- `/tim`: search query and pagination.
- Product detail: image tabs, quantity, add to cart, buy online.
- Cart: select, quantity, save for later, delete, quote refresh.
- Checkout: selected items, invalid item, submit validation.
- Header: badge, desktop menu, mobile menu.

See `..\PROJECT_PROGRESS.md` for current test gaps and production blockers.
