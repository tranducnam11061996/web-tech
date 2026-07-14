# HACOM Storefront

Last verified: `2026-07-15`

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

The storefront CSP permits `unsafe-eval` only under `next dev`, because React's development diagnostics require it. Production builds keep `script-src` without `unsafe-eval`.

## Main journeys

- Product detail renders the API-provided Product Group only when at least two valid sellable SKUs include the current product. It shows four SKU cards per slide, uses each SKU's real thumbnail plus prices/slugs, and issues no extra group request.
- Product-detail gallery utilities are conditional: normalized YouTube videos open in a lazy modal that mounts only the active player, and meaningful API-provided specification HTML opens the existing technical-specification modal. Invalid legacy video data is omitted by `web-admin` and never becomes a browser iframe source.
- Product descriptions retain a visible bounded preview while collapsed and expose an accessible “Xem thêm” / “Thu gọn” control for the remaining article content.
- Product details without an article reuse the description disclosure/content structure with a product-name heading, a direct full-width centered thumbnail, and normalized `proSummary` rows below it without visual list markers; article products keep their rendered markup and both branches preserve the technical-specification height reference.
- On desktop, the technical-specification column compares its natural table height with the description's collapsed height: overflowing content clips to that exact height and keeps the modal action, while fitting content renders fully without an overlay/action. The preview keeps the collapsed reference while an independent outer boundary follows the description's current height, anchoring at `110px` until the description bottom; transient zero-size startup measurements retry without a scroll listener. Mobile keeps the existing `66vh` modal preview.
- Product-detail quick specifications show all non-empty `proSummary` rows when there are at most five. Longer summaries start with five rows and provide the accessible “Xem thêm thông số kỹ thuật” / “Thu gọn thông số” disclosure without changing the full specification modal.
- Homepage bootstrap, managed header/homepage content, banners, product sections, and category feature boxes.
- Product/category dynamic slug pages, category filters/sort/pagination, search, and collections.
- Shared progressive images reconcile cached success/failure after hydration: loaded images always clear their loading classes, failed images fall back once to the local SVG placeholder, and source changes cannot be overwritten by stale load events.
- Real product cards use the shared `product-card-image-frame`: the media box is always a non-shrinking `1:1` square and portrait/landscape/square images remain centered and uncropped through `object-fit: contain`. Galleries, commerce thumbnails, news and banners keep their specialized layouts.
- Product-category and search pagination use canonical URL state: page one omits `page`, while later pages use `?page=N`. Direct loads and browser Back/Forward restore the requested page; filter/sort changes return to page one, and client API failures stay inside the product grid with a retry action.
- Category headings and SSR document titles use `metaTitle` only when its trimmed value has at least five characters; invalid legacy values such as `0` fall back to the category name. The catalog control bar provides sorting only, without a standalone text search control.
- Product-category pages keep the requested category's metadata/breadcrumb/feature box while backend list, count, price, brand and attribute data includes that enabled category plus all enabled descendants. `/pc-van-phong.html` is the verified reference route: category 521 renders 34 distinct enabled products; inactive categories remain 404.
- Canonical brand pages at `/brand/[slug]`; homepage brands use backend-provided canonical IDs/slugs and remote PCMarket logos with a text fallback.
- Shared dynamic breadcrumbs on product, product-category, article, and news-category pages. `/` and `/tin-tuc` intentionally omit them; narrow viewports scroll the trail locally without widening the document.
- Product detail renders independent “Sản phẩm tương tự”, “Sản phẩm đã xem”, and “Bài viết liên quan” sections only when each has content. Recently viewed history is versioned browser-local data, hides the current product, and revalidates up to 15 prior cards in one bounded request.
- Product and product-category detail pages render an optional API-provided “Lý do nên mua” accordion. It is absent when no active entity-specific guide exists and is intentionally not rendered on homepage, search, or news pages.
- Product detail renders only active API-provided vouchers that apply globally or to the product category tree. The voucher card and “Xem tất cả voucher” action are absent when the list is empty; copying a code never bypasses server quote validation.
- The independent numbered product-promotion block uses the embedded `productPromotions` array, hides when empty, renders at most 50 live items in priority order, and opens internal detail paths in the same tab or HTTPS destinations in a safe new tab. It never changes quote or order values.
- Guest cart stored under `hacom.cart.v1` and server-validated quote.
- Checkout with customer/contact/address/invoice fields, voucher quote, CAPTCHA, idempotent order submission, and preserved retry state.
- Customer registration, verification, login, password recovery/change, profile, addresses, and order history under `/tai-khoan`.
- Real catalog cards and the product gallery expose one accessible favorite control. Guests are sent to login without a favorite API request; successful intent login saves idempotently and continues to `/yeu-thich`. Signed-in card states are deduplicated into batches of at most 100, shared across duplicate cards, and the separate noindex list loads 24 live cards per cursor page with retry/load-more/remove states.

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

The `2026-07-15` working-tree audit passed TypeScript, ESLint `--quiet`, production build, and npm audit with zero known vulnerabilities. The focused category-title/mega-menu run passed 8 tests with 2 expected project/device skips using one worker. The full 76-test run with 12 workers was resource-inconclusive: 44 pass, 4 skip, and 28 failures dominated by `ERR_INSUFFICIENT_RESOURCES`, navigation timeouts, and cascading selector failures. Rerun with controlled concurrency before classifying product regressions.

Current referenced JavaScript exceeds both regression and release budgets for product detail (236.8 KB), cart (175.5 KB), checkout (190.8 KB), and combo checkout (187.4 KB). Combo cart passes at 167.7 KB. Strict local health is 13/15 because the configured collection API/page are absent; empty-catalog mode passed 15/15 while MySQL was healthy. These are local regression observations, not production Web Vitals or 1,500-user capacity evidence. See `../PROJECT_AUDIT_2026-07-15.md`.
