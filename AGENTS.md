# HACOM Workspace Instructions

Last verified: `2026-07-11`

Read `AI_HANDOFF.md` before changing this workspace. It is the canonical current-state handoff. Then read `ARCHITECTURE.md`, `PROJECT_PROGRESS.md`, the applicable app README, and `web-admin/database-docs/DATABASE_SCHEMA.md` for database work.

## Workspace boundaries

- `web-admin` is the admin application, REST backend, background-worker owner, and the only application allowed to connect to MySQL.
- `font-end` is the customer storefront. It must use `web-admin` APIs and must never import a database client or read database credentials.
- `search-tool` is an older prototype/reference. Production search lives in `web-admin`.
- Uploaded media lives outside either Next.js application under `MEDIA_ROOT` and is served by `web-admin /api/media/[...path]`.

## Change safety

- The working tree may contain uncommitted user and AI changes. Inspect `git status` and relevant diffs before editing. Never reset, discard, or overwrite unrelated work.
- Admin writes and admin migrations require `ADMIN_WRITE_ENABLED=true`. Never enable it casually or against an unidentified database.
- Prefer additive `web_admin_*` tables and measured indexes. Do not change legacy table contracts, collations, engines, or data without an explicit migration and rollback plan.
- Preserve transaction boundaries for order, voucher, customer metrics, idempotency, and email outbox writes.
- Do not trust prices, voucher state, customer IDs, payment state, or address ownership from the client.
- Public write routes must keep body limits, canonical validation, safe error envelopes, request IDs, origin checks, abuse controls, and applicable CAPTCHA/idempotency checks.
- Keep production cookies `Secure`, `HttpOnly`, `SameSite=Lax`, path `/`; rotate/revoke sessions after password or privilege changes.
- Do not expose raw SQL errors, secrets, OTPs, password hashes, CAPTCHA tokens, or customer personal data in logs or responses.

## Required verification

Run checks in both applications after meaningful code changes:

```powershell
cd D:\web-tech\web-admin
npx.cmd tsc --noEmit
npm.cmd run lint -- --quiet
npm.cmd run test:unit
npm.cmd run test:integration
npm.cmd run build
```

```powershell
cd D:\web-tech\font-end
npx.cmd tsc --noEmit
npm.cmd run lint -- --quiet
npm.cmd run build
```

When both production servers are running, execute `npm.cmd run local:healthcheck` from `web-admin`. A production-capacity claim additionally requires the full k6 scenario on a production-like staging host; local functional checks are not evidence that 1,500 VUs are supported.

## Documentation ownership

- `AI_HANDOFF.md`: canonical current state and next work.
- `ARCHITECTURE.md`: stable boundaries and runtime/data flows.
- `PROJECT_PROGRESS.md`: completion, verification, risks, and backlog.
- `CHANGELOG.md`: dated implementation history.
- `SECURITY_AND_LOAD_MATRIX.md`: coverage and release gates.
- App READMEs: app-specific commands, routes, and contracts.
- `web-admin/database-docs`: schema snapshots, migrations, and query references.

Update these files when implementation status, public contracts, schema, operational commands, or verification results change.
