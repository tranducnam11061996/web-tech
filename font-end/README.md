# HACOM Storefront

Last verified: `2026-07-11`

`font-end` is the customer-facing Next.js 16.2.9/React 19.2.4 storefront. It consumes `web-admin` APIs and must never access MySQL or backend secrets directly.

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

- Homepage bootstrap, managed header/homepage content, banners, product sections, and category feature boxes.
- Product/category dynamic slug pages, category filters/sort/pagination, search, and collections.
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

- Keep server components by default and minimize client boundaries/state duplication.
- Dynamically import heavy dialogs/carousels and delay reCAPTCHA/nonessential scripts until interaction.
- Use responsive `next/image`, AVIF/WebP, dimensions, lazy loading below the fold, and preload only the actual LCP image.
- Avoid request waterfalls; fetch independent data in parallel and use the homepage bootstrap/public caches.
- Respect ETag/cache behavior and do not add per-product attribute requests when product/search payloads already include card badges.

## UI preservation rules

For established homepage `Section*.tsx` markup, bind dynamic data into existing structure unless a task explicitly requests a redesign. Do not duplicate a section in another component, add wrappers/classes merely to consume data, or silently restore stale hardcoded content after an API failure.

## Verification status

Latest local TypeScript, ESLint `--quiet`, production build, npm audit, storefront health routes, and shared 13/13 healthcheck passed. Header payload was reduced to about 51 KB and homepage bootstrap to about 97 KB in the latest local measurement. These are regression observations, not proof of production Web Vitals or 1,500-user capacity.
