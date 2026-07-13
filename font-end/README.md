# HACOM Storefront

Last verified: `2026-07-13`

`font-end` is the customer-facing Next.js 16.2.9/React 19.2.4 storefront. It consumes `web-admin` APIs and must never access MySQL or backend secrets directly.

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

## Main journeys

- Product detail renders the API-provided Product Group only when at least two valid sellable SKUs include the current product. It shows four SKU cards per slide, uses each SKU's real thumbnail plus prices/slugs, and issues no extra group request.
- Product-detail gallery utilities are conditional: normalized YouTube videos open in a lazy modal that mounts only the active player, and meaningful API-provided specification HTML opens the existing technical-specification modal. Invalid legacy video data is omitted by `web-admin` and never becomes a browser iframe source.
- Homepage bootstrap, managed header/homepage content, banners, product sections, and category feature boxes.
- Product/category dynamic slug pages, category filters/sort/pagination, search, and collections.
- Shared dynamic breadcrumbs on product, product-category, article, and news-category pages. `/` and `/tin-tuc` intentionally omit them; narrow viewports scroll the trail locally without widening the document.
- Product detail ends with independent “Sản phẩm tương tự”, “Sản phẩm đã xem”, and “Bài viết liên quan” sections. Recently viewed history is versioned browser-local data, hides the current product, and revalidates up to 15 prior cards in one bounded request.
- Product and product-category detail pages render an optional API-provided “Lý do nên mua” accordion. It is absent when no active entity-specific guide exists and is intentionally not rendered on homepage, search, or news pages.
- Product detail renders only active API-provided vouchers that apply globally or to the product category tree. The voucher card and “Xem tất cả voucher” action are absent when the list is empty; copying a code never bypasses server quote validation.
- The independent numbered product-promotion block uses the embedded `productPromotions` array, hides when empty, renders at most 50 live items in priority order, and opens internal detail paths in the same tab or HTTPS destinations in a safe new tab. It never changes quote or order values.
- Guest cart stored under `hacom.cart.v1` and server-validated quote.
- Checkout with customer/contact/address/invoice fields, voucher quote, CAPTCHA, idempotent order submission, and preserved retry state.
- Customer registration, verification, login, password recovery/change, profile, addresses, and order history under `/tai-khoan`.

## Data boundaries

- Treat client product price/status as display cache only. Quote/order APIs are authoritative.
- Do not send or trust payment status, voucher validity/quota, customer IDs, address ownership, or totals from browser state.
- Prefix relative media/API paths using the configured API origin; never leak server environment variables into client bundles.
- Public menu/banner/homepage responses are already reduced for runtime use; do not reintroduce admin metadata into client state.

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

## Form and accessibility rules

- Mirror backend max lengths, input types, `inputMode`, autocomplete, min/max/step, and helper text.
- Keep server validation canonical; browser validation improves UX but is not security.
- Link each error with `aria-describedby`, set `aria-invalid`, use an `aria-live` summary, and focus the first invalid control.
- Preserve field values for validation, rate-limit, network, CAPTCHA, and system failures.
- Prevent double submit with pending state plus backend idempotency; disabling a button alone is insufficient.
- Dialogs must have an accessible name, trap/restore focus, and close with Escape when dismissal is safe.

## Performance rules

- Server components call `web-admin` through server-only `API_INTERNAL_URL`; browser requests use same-origin `/api/*` paths.
- Product detail requests `include=core` and streams `/api/products/[slug]/supplemental` without changing section order. Recently viewed content loads near the viewport.
- Run `npm run perf:budget` for no-regression budgets and `npm run perf:budget:release` for strict 205 KB product/170 KB commerce release targets.
- Run `npm run test:e2e` after `npx playwright install chromium`; set `PLAYWRIGHT_PRODUCT_SLUG` to include carousel checks. `npm run perf:lighthouse` writes local reports when the Chrome/Lighthouse runtime is healthy.

- Keep server components by default and minimize client boundaries/state duplication.
- Dynamically import heavy dialogs/carousels and delay reCAPTCHA/nonessential scripts until interaction.
- Use responsive `next/image`, AVIF/WebP, dimensions, lazy loading below the fold, and preload only the actual LCP image.
- Avoid request waterfalls; fetch independent data in parallel and use the homepage bootstrap/public caches.
- Respect ETag/cache behavior and do not add per-product attribute requests when product/search payloads already include card badges.

## UI preservation rules

For established homepage `Section*.tsx` markup, bind dynamic data into existing structure unless a task explicitly requests a redesign. Do not duplicate a section in another component, add wrappers/classes merely to consume data, or silently restore stale hardcoded content after an API failure.

## Verification status

Latest local TypeScript, ESLint `--quiet`, production build, npm audit, storefront health routes, and shared 13/13 healthcheck passed. Header payload was reduced to about 51 KB and homepage bootstrap to about 97 KB in the latest local measurement. These are regression observations, not proof of production Web Vitals or 1,500-user capacity.
