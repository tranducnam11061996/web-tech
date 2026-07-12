# Local Stability Checklist

Last updated: `2026-07-11`

Use this before merging meaningful changes or promoting a build to staging.

## Environment and migration

- [ ] Confirm the intended database host/name before enabling any writes.
- [ ] Copy committed examples to ignored local env files; never add real secrets to Git.
- [ ] Run additive admin migration only when required: set `ADMIN_WRITE_ENABLED=true`, run `npm.cmd run admin:migrate`, then disable the flag if local writes are not needed.
- [ ] Confirm `/api/health/ready` returns `200`; `migration_required` means required runtime tables are absent.
- [ ] Run `db:indexes`, `admin:access-migrate`, or search migrations only when their documented preconditions apply.

## Processes

- [ ] Start MySQL, `web-admin` on 3000, storefront on 3001, and the background worker when testing outbox/cleanup.
- [ ] Confirm `/api/health/live`, `/api/health/ready`, and storefront `/` return `200`.
- [ ] Inspect worker output for repeated outbox/cleanup failures without exposing message content or customer data.

## Automated checks

- [ ] Run TypeScript, ESLint `--quiet`, and production build in both applications.
- [ ] Run `test:unit` and `test:integration` from `web-admin`.
- [ ] Run `npm.cmd audit` in both applications and review any nonzero result.
- [ ] Run `npm.cmd run local:healthcheck`; require all 13 checks to pass.
- [ ] Run `git diff --check` and inspect `git status --short` before handoff.

## Manual functional/security smoke

- [ ] Browse homepage, large category, product, collection, search, cart, and account pages on desktop and 375px width.
- [ ] Test valid/invalid quote and checkout without submitting an unintended real order.
- [ ] Verify duplicate order submissions reuse the same idempotency key and do not create duplicate rows.
- [ ] Verify invalid origin, missing order key, malformed payload, unsigned webhook, and unauthenticated admin API produce safe errors.
- [ ] Test register/login/OTP/reset/address forms for validation, retained values, field errors, `429` countdown, keyboard focus, and network failure.
- [ ] Test admin login, forced password change, logout, role visibility, blocked user, and direct `401`/`403` behavior.
- [ ] Confirm no raw SQL error, secret, password/OTP hash, CAPTCHA token, or customer PII appears in browser/server logs.

## Local performance

- [ ] Record cold/warm products, search, homepage bootstrap, product detail, and collection timings with `local:benchmark`.
- [ ] Re-run `db:explain-hot` after query/schema/import changes and investigate unexpected hot full scans.
- [ ] Confirm cache invalidation reaches both API workers when testing clustered runtime.

Local timing and repeat-request checks are regression signals only. They do not replace the production-like k6 release gate.
