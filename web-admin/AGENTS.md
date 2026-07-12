# web-admin Agent Instructions

Read root `../AGENTS.md` and `../AI_HANDOFF.md` first. This file adds backend/admin-specific rules.

## Ownership

- This application is the only MySQL owner and serves admin UI plus public/admin/customer APIs.
- Use `src/lib/db.ts`; do not create per-request pools or database clients elsewhere.
- Keep storefront-specific UI in `font-end`; keep secrets and privileged logic here.

## Database and migrations

- Writes and admin migration require `ADMIN_WRITE_ENABLED=true`.
- Prefer additive InnoDB `web_admin_*` tables and measured indexes. Preserve legacy schema/encoding/engine contracts unless an explicit migration says otherwise.
- Do not assume foreign keys/cascade exist on legacy tables or that MyISAM writes roll back.
- Keep order, voucher, customer metrics, idempotency, and outbox mutations in the intended transaction.
- Read `database-docs/ADMIN_MIGRATION_GUIDE.md` before any schema operation.

## API safety

- Parse bounded bodies, enforce content type, validate through canonical schemas, and reject invalid commerce data instead of coercing it.
- Public writes need request IDs, safe envelopes, origin/CORS checks, appropriate atomic rate limits, and applicable CAPTCHA/idempotency protections.
- Admin writes need session, RBAC, same-origin behavior, write gate, and audit handling.
- Never trust client price/status/ownership/payment/voucher state or expose raw SQL/exception details.
- Preserve `Retry-After` for `429` and replay behavior for order idempotency.

## Security invariants

- Keep password compatibility: Argon2id for new writes, verify and upgrade valid legacy bcrypt.
- Store sensitive tokens as hashes where designed. Never log OTPs, password/CAPTCHA/session tokens, secrets, or PII.
- Keep production cookies Secure/HttpOnly/SameSite=Lax/path `/`, using `__Host-*` when supported.
- Search webhook requires HMAC timestamp/nonce verification; upload routes require binary signature and path-containment checks.

## Performance invariants

- Keep DB pool/queue/timeouts bounded; acquire a connection only after cheap validation/abuse checks.
- Keep public cache keys normalized/bounded, refresh single-flight, and bump shared cache versions after mutations.
- Preserve reduced public response shapes and ETag/conditional GET behavior.
- Do not add per-item queries or sequential inserts to hot catalog/checkout paths.

## UI/editor rules

- Keep TinyMCE loading inside `RichTextEditor`, never the root layout.
- Preserve vertical-only resizing for long-form editors via the existing `resizable` behavior.
- Admin forms should provide field errors and keyboard/focus support, but ordinary authenticated forms should not show CAPTCHA unless step-up verification is required.

## Verification

Run TypeScript, ESLint `--quiet`, unit/integration tests, production build, and the local healthcheck as documented in root `AGENTS.md`. Full k6 is a staging release gate, not a local development command.
