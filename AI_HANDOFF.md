# AI Handoff — HACOM Workspace

Last verified: `2026-07-11`

This is the canonical handoff for the next AI or engineer. Read `AGENTS.md` first, then this file, `ARCHITECTURE.md`, and `PROJECT_PROGRESS.md`.

## Current repository state

- Branch at verification: `main`, HEAD `504d36e` (`feat: update storefront search vouchers and order management`).
- The working tree is intentionally dirty with a large set of user and AI changes spanning customer accounts, checkout, validation/security, public cache performance, runtime configuration, tests, and documentation.
- Do not reset, checkout, clean, or overwrite these changes. Inspect `git status --short` and focused diffs before editing.
- Both applications now use Next.js `16.2.9` and React `19.2.4`.
- `web-admin` is the only MySQL owner. `font-end` consumes its APIs.
- `search-tool` is reference material; production search is under `web-admin/src/lib` and `/api/search`.

## What was just implemented

### Checkout, voucher, and order

- `POST /api/orders` validates a bounded body before acquiring a DB connection, verifies origin/CAPTCHA/rate limits, and requires `Idempotency-Key`.
- A single transaction performs final quote, voucher `FOR UPDATE` handling, order header, bulk order items, customer link/metrics, idempotency completion, and email outbox enqueue.
- Replaying the same key and payload returns the stored response; using the same key with another payload returns `409`.
- `POST /api/cart/quote` rejects invalid payloads instead of silently clamping. Cart limits are 50 distinct products and quantity 1–99.

### Customer and authentication

- Customer registration, verification, login, OTP resend, password reset/change, profile, addresses, and orders are implemented.
- Canonical Zod schemas normalize email, Vietnamese phone numbers, names, dates, passwords, addresses, and cart/order payloads.
- New password hashes use Argon2id; valid legacy bcrypt hashes are upgraded after login.
- Customer sessions have sliding idle expiry bounded by absolute expiry. Production cookie names prefer `__Host-*` and use `Secure`, `HttpOnly`, `SameSite=Lax`, path `/`.
- Action-specific reCAPTCHA v3 and atomic MySQL rate limits protect anonymous high-risk forms. CAPTCHA supports shadow mode for rollout.

### Public APIs, cache, and security

- Public read routes use reduced payloads, bounded filters/pages, weak ETags, `304` responses, and local single-flight caches.
- `web_admin_cache_versions` synchronizes invalidation across the two admin/API workers.
- Search prewarms at worker start and keeps the current index while rebuilding.
- Search webhook requires HMAC SHA-256 over `timestamp.nonce.rawBody`, a five-minute timestamp window, and a one-use nonce.
- Public write errors use `{ success:false, error:{ code, message, fields?, requestId } }`; responses carry `X-Request-ID`, and rate-limit responses carry `Retry-After`.
- Upload routes validate extension, declared MIME, binary image signature, size, randomized name, and containment under `MEDIA_ROOT`.

### Runtime and frontend

- The storefront product-detail hero now uses a desktop `40/30/30` gallery/information/purchase grid, a two-column tablet reflow, and a single-column mobile flow. Cart and buy-now behavior remain live; bundle, voucher, variant, favorite, and financing additions are frontend-only demos pending backend contracts.
- `Caddyfile` provides compression, security headers, body limits, proxy timeouts, and trusted forwarding behavior.
- `ecosystem.config.cjs` defines two `web-admin` workers, one storefront worker, and one background worker.
- The background worker sends transactional email outbox entries with retry/backoff and cleans expired rate-limit, idempotency, nonce, OTP, challenge, and session records in small batches.
- Storefront checkout creates a UUID idempotency key per submission, gets CAPTCHA only at submit time, preserves form data on failure, and distinguishes validation, rate-limit, network, and system failures.
- Selected customer/checkout forms include bounded inputs, browser metadata, field error linkage, alert regions, keyboard focus handling, and double-submit protection.

## Database state

Read-only verification on `2026-07-11` found:

- 280 tables total: 152 InnoDB, 128 MyISAM.
- The product image, managed menu, banner metadata, product-card rules, category feature, voucher, customer, idempotency, rate-limit, email outbox, cache-version, and webhook-nonce tables exist.
- The previous product/search exact count of 28,763 and zero missing search rows was last verified on `2026-07-07`; re-query before presenting it as current.
- The latest additive admin migration has been applied to the configured local database. Do not assume it has run on another environment.

Important new infrastructure tables:

- `web_admin_order_requests`
- `web_admin_request_limits`
- `web_admin_email_outbox`
- `web_admin_cache_versions`
- `web_admin_webhook_nonces`
- `web_admin_vouchers`, `web_admin_voucher_categories`, `web_admin_voucher_redemptions`
- `web_admin_storefront_customers` and related password/session/OTP/address/order-link/metrics tables

## Code ownership map

| Concern | Primary owner |
|---|---|
| DB pool | `web-admin/src/lib/db.ts` |
| Request parsing/errors/origin | `web-admin/src/lib/publicRequest.ts` |
| Canonical commerce/customer validation | `web-admin/src/lib/commerceValidation.ts` |
| Rate limits, cleanup, cache versions, webhook nonces | `web-admin/src/lib/performanceInfrastructure.ts` |
| Order idempotency and outbox | `web-admin/src/lib/orderInfrastructure.ts` |
| Quote/order flow | `web-admin/src/lib/cart-quote.ts`, `web-admin/src/app/api/orders/route.ts` |
| Voucher transaction rules | `web-admin/src/lib/vouchers.ts` |
| Customer accounts/sessions | `web-admin/src/lib/customerAccounts.ts`, `/api/customer/*` |
| Search runtime | `web-admin/src/lib/publicSearch.ts`, `/api/search` |
| Checkout UI | `font-end/src/app/thanh-toan/CheckoutClient.tsx` |
| Runtime jobs | `web-admin/scripts/background-worker.ts` |

## Environment and rollout requirements

- Configure production `STOREFRONT_ORIGIN`, CAPTCHA site/secret keys, allowed hostnames, `SEARCH_WEBHOOK_SECRET`, database pool limits, SMTP, and media paths.
- Keep CAPTCHA in shadow mode first, inspect per-action metrics, then enable enforcement with backend and frontend in the same release.
- Default target topology is one 8 vCPU/16 GB machine with MySQL on the same host, Caddy, two API workers, storefront, and background worker.
- Each API worker defaults to 12 MySQL connections. Preserve at least 30% server connections for maintenance/migrations.

## Verification commands

```powershell
cd D:\web-tech\web-admin
npx.cmd tsc --noEmit
npm.cmd run lint -- --quiet
npm.cmd run test:unit
npm.cmd run test:integration
npm.cmd run build
npm.cmd audit
```

```powershell
cd D:\web-tech\font-end
npx.cmd tsc --noEmit
npm.cmd run lint -- --quiet
npm.cmd run build
npm.cmd audit
```

With both apps running:

```powershell
cd D:\web-tech\web-admin
npm.cmd run local:healthcheck
npm.cmd run local:benchmark
```

The last run passed 5/5 validation tests, 1/1 idempotency integration test, both typechecks/lints/builds/audits, readiness/liveness, and 13/13 health checks.

Observed local benchmark after payload reduction:

| Route/data | Result |
|---|---:|
| Products warm | ~3.1 ms |
| Search cold / warm | ~126 ms / ~2.0 ms |
| Homepage bootstrap warm | ~4.8 ms |
| Header payload | 99,097 → 51,415 bytes |
| Homepage bootstrap payload | 148,256 → 96,610 bytes |

These are local observations, not production SLO proof.

## Highest-priority next work

1. Deploy to an isolated production-like 8 vCPU/16 GB staging host and run `npm.cmd run load:k6`; retain k6, CPU, RAM, MySQL pool, slow-query, and error metrics for the full ramp/hold test.
2. Verify reCAPTCHA hostname/action/score metrics in shadow mode, then explicitly enable enforcement.
3. Configure and test Caddy/PM2 process restart, graceful rollout, outbox retry, and cleanup behavior on the target OS.
4. Expand integration/E2E coverage across all write routes and all 15 forms, especially upload, admin RBAC, customer OTP/session revoke, concurrent voucher redemption, `429`, accessibility, and network failures.
5. Review remaining write routes against `SECURITY_AND_LOAD_MATRIX.md`; shared foundations exist, but do not assume every legacy admin form has canonical field-level Zod coverage.
6. Decide separately whether root scratch/debug files should be removed. Do not delete them as part of unrelated work.

## Release blocker

The full 1,500-VU, 150-RPS, up-to-10-checkout/s k6 scenario has not been run on a production-like host. Capacity is therefore **not yet certified**. If the target host misses the documented thresholds, record a capacity blocker and separate MySQL or add a second host; do not weaken the acceptance criteria.
