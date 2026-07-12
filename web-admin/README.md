# HACOM Backend API and Admin Dashboard

Last verified: `2026-07-11`

`web-admin` is a Next.js 16.2.9 application that owns the admin UI, all REST APIs, all MySQL access, media serving, migrations, and background jobs. Read root `AGENTS.md` and `AI_HANDOFF.md` first.

## Responsibilities

- Public storefront APIs for catalog, categories, collections, content, menus, banners, search, quote, and order creation.
- Customer APIs for authentication, profile, addresses, locations, and order history.
- Authenticated/RBAC-protected admin APIs and screens for catalog, content, commerce, users, roles, and customer CRM.
- MySQL connection pool, legacy schema integration, additive `web_admin_*` tables, cache invalidation, and search infrastructure.
- Transactional email outbox, expired-record cleanup, readiness/liveness, and media serving.

## Environment

Use `.env.example` as the authoritative key list. Major groups:

- `DATABASE_URL`; optional pool tuning via `DB_CONNECTION_LIMIT`, `DB_QUEUE_LIMIT`, `DB_CONNECT_TIMEOUT_MS`.
- `ADMIN_WRITE_ENABLED` for write APIs/migrations. Migration commands intentionally fail unless it is exactly `true`.
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `STOREFRONT_ORIGIN`.
- `RECAPTCHA_SECRET_KEY`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, score/hostname/shadow/bypass controls.
- `SEARCH_WEBHOOK_SECRET`.
- SMTP/outbox variables and `BACKGROUND_WORKER_POLL_MS`.
- `MEDIA_ROOT`, `MEDIA_BASE_URL`, and Vietnam location provider/cache variables.

Never put real secrets into committed examples or logs.

## Commands

```powershell
npm.cmd run dev
npm.cmd run dev:clean
npm.cmd run build
npm.cmd run start
npm.cmd run lint -- --quiet
npx.cmd tsc --noEmit
```

```powershell
npm.cmd run admin:migrate
npm.cmd run admin:access-migrate
npm.cmd run admin:bootstrap
npm.cmd run locations:sync
npm.cmd run search:migrate
npm.cmd run search:rebuild
npm.cmd run search:test-ranking
```

```powershell
npm.cmd run worker:background
npm.cmd run local:healthcheck
npm.cmd run local:benchmark
npm.cmd run storefront:benchmark
npm.cmd run db:indexes
npm.cmd run db:explain-hot
npm.cmd run test:unit
npm.cmd run test:integration
npm.cmd run load:k6
```

Run `load:k6` only against an approved isolated target. It is not a local smoke test.

## API groups

### Public reads

- `/api/products`, `/api/products/[slug]`, `/api/search`, `/api/search-attributes`.
- `/api/categories/*`, `/api/collections/[slug]`.
- `/api/homepage/bootstrap`, `/api/menu/header`, `/api/menu/homepage`.
- `/api/banners/homepage`, `/api/banners/global`, `/api/banners/location/[locationKey]`.
- `/api/news/[slug]`, `/api/news-category/[slug]`, `/api/media/[...path]`.

Public read APIs use bounded inputs, reduced response shapes, local single-flight caches, ETags, and cross-worker invalidation where applicable.

### Commerce writes

- `POST /api/cart/quote`: validates up to 50 distinct products with integer quantity 1–99; never trusts client prices.
- `POST /api/orders`: requires storefront origin, `recaptchaToken`, and an `Idempotency-Key` UUID-like value.

Order creation performs final quote, voucher locking, order/items, customer link/metrics, idempotency completion, and email outbox enqueue in one transaction. Email delivery occurs asynchronously after commit.

### Customer

- `/api/customer/auth/register`, `/verify-email`, `/resend-verification`, `/login`, `/logout`.
- `/api/customer/auth/forgot-password/request`, `/confirm`, `/change-password`.
- `/api/customer/me`, `/addresses`, `/orders`, and `/locations/*`.

Anonymous high-risk actions use action-specific reCAPTCHA and IP/identifier rate limits. Authenticated writes use customer session, origin/ownership checks, and route limits.

### Admin

Admin API groups live under `/api/admin/*`. Mutations require authenticated session, RBAC permission, same-origin handling, audit behavior where applicable, and `ADMIN_WRITE_ENABLED=true`. Do not add CAPTCHA to ordinary post-login admin forms; use re-authentication or step-up controls only for sensitive/risky actions.

### Health and webhook

- `GET /api/health/live`: process liveness.
- `GET /api/health/ready`: DB and required runtime-table readiness.
- `POST /api/webhook/update-search`: requires `X-Webhook-Timestamp`, `X-Webhook-Nonce`, and `X-Webhook-Signature`.

Signature input is `${timestamp}.${nonce}.${rawBody}` using HMAC SHA-256 with `SEARCH_WEBHOOK_SECRET`. Reject stale timestamps and reused nonces.

## Public error contract

Hardened public write routes return:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Vietnamese user-facing message",
    "fields": { "field": "Field error" },
    "requestId": "correlation id"
  }
}
```

Responses include `X-Request-ID`. Rate-limit responses use HTTP `429` plus `Retry-After`. Never return raw exceptions or SQL details.

## Password, session, and CAPTCHA rules

- New customer/admin password hashes use Argon2id. Continue reading bcrypt hashes and rehash after successful verification.
- Store only hashed session/OTP/idempotency/rate-limit identifiers where designed.
- Production session cookies are `Secure`, `HttpOnly`, `SameSite=Lax`, path `/`, and prefer `__Host-*` names.
- reCAPTCHA verification checks success, expected action, configurable score, allowed hostname, and two-minute challenge age. Use shadow mode before production enforcement.

## Cache and search

- Worker-local public caches are bounded and use normalized keys.
- `web_admin_cache_versions` propagates invalidation between clustered API workers.
- Search prewarms at process start and uses single-flight/stale data during rebuild.
- `product_data_search`, its normalize function, triggers, and FK remain part of the production search contract.
- `search-tool` is not runtime code.

## Upload rules

- Resolve all destinations under `MEDIA_ROOT` and use randomized file names.
- Enforce body/file size, extension allowlist, declared MIME, and binary image signature.
- Product albums support `product`, `self`, and `customer`; keep legacy thumbnail/image collection/count synchronized while legacy readers exist.

## Database status

The additive admin migration was run on the configured local database. Read-only verification on `2026-07-11` found 280 tables: 152 InnoDB and 128 MyISAM, including the new customer, voucher, idempotency, rate-limit, outbox, cache-version, webhook-nonce, media, menu, and content helper tables.

This does not prove migration state in any other environment. Follow `database-docs/ADMIN_MIGRATION_GUIDE.md`.

## Verification status

Latest local checks passed TypeScript, ESLint `--quiet`, production build, 5 validation tests, the idempotency/rollback integration test, npm audit with zero known vulnerabilities, readiness/liveness, and 13/13 health checks. Full 1,500-VU target testing remains pending.
