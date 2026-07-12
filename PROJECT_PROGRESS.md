# Project Progress

Last updated: `2026-07-11`

`AI_HANDOFF.md` is the canonical continuation guide. This file records completion evidence, open verification, and the prioritized backlog.

## Current status

| Area | Status | Evidence / qualification |
|---|---|---|
| Storefront catalog/search/collections | Implemented and locally verified | Bounded APIs, ETag, reduced payloads, cache/single-flight, responsive image behavior |
| Guest cart and checkout | Hardened and locally verified | Strict quote, transactional order, voucher lock, idempotency, outbox, CAPTCHA/rate limit |
| Customer accounts | Implemented | Registration/OTP/login/reset/profile/address/order flows and admin CRM surfaces exist |
| Admin auth and RBAC | Implemented | Session, role/permission checks, write gate, audit surfaces, login throttling |
| Admin content/catalog | Implemented first production-oriented pass | Product/category/article/menu/banner/collection/voucher/customer/order/user/role management |
| Search | Implemented | Runtime search in `web-admin`, prewarm/single-flight, signed webhook; `search-tool` is reference only |
| Runtime topology | Implemented as configuration | Caddy, PM2, readiness/liveness, two API workers, storefront, background worker |
| Database migration | Applied to configured local DB | 280 tables: 152 InnoDB, 128 MyISAM on 2026-07-11 |
| Functional verification | Passed locally | TypeScript, lint, builds, tests, audits, readiness/liveness, 13/13 health checks |
| 1,500-VU capacity | Not yet verified | Full k6 production-like run remains a release blocker |

## Completed in the latest hardening pass

- Added canonical Zod validation and bounded parsing for high-risk commerce/customer routes.
- Added request IDs, safe public error envelopes, origin allowlist, `Retry-After`, atomic rate limits, honeypots, and action-specific reCAPTCHA.
- Reworked order creation around one quote/transaction, bulk item insert, voucher locking, idempotency replay, customer metrics, and email outbox.
- Added Argon2id password writes with bcrypt compatibility/upgrade and improved sliding session expiry.
- Added HMAC/timestamp/nonce protection for search webhook and image-content signature validation for uploads.
- Added DB-backed cross-worker cache versions, ETags, bounded filters/keys, search prewarm, and reduced public payloads.
- Upgraded storefront to Next.js 16.2.9/React 19.2.4 and added a committed ESLint configuration.
- Added Caddy/PM2 topology, background job runner, readiness/liveness, unit/integration tests, benchmark script, and k6 scenario.

## Latest verification matrix

| Check | Result |
|---|---|
| `web-admin` TypeScript | Pass |
| `font-end` TypeScript | Pass |
| `web-admin` ESLint `--quiet` | Pass |
| `font-end` ESLint `--quiet` | Pass |
| `web-admin` production build | Pass |
| `font-end` production build | Pass |
| Validation unit tests | 5/5 pass |
| Idempotency/rollback integration test | 1/1 pass |
| npm audit in both apps | 0 known vulnerabilities |
| Local healthcheck | 13/13 pass |
| Liveness/readiness/storefront | HTTP 200 |
| Invalid quote/origin/order-key/webhook probes | Expected safe 4xx/5xx responses |
| Full k6 1,500 VU | Not run on production-like host |

## Latest local performance observations

| Measurement | Observed |
|---|---:|
| Products cold / warm | ~28.1 ms / ~3.1 ms |
| Search cold / warm | ~126.1 ms / ~2.0 ms |
| Homepage bootstrap cold / warm | ~21.6 ms / ~4.8 ms |
| Header payload | 51,415 bytes, down from 99,097 |
| Homepage bootstrap payload | 96,610 bytes, down from 148,256 |

These results are development-machine observations and must not be used as production SLO evidence.

## Prioritized next work

1. Run the complete `load:k6` scenario on an isolated target-like host and capture application, MySQL, CPU, RAM, pool, and slow-query metrics.
2. Validate production reCAPTCHA hostnames/actions/scores in shadow mode, then enable enforcement in a coordinated frontend/backend release.
3. Exercise graceful PM2/Caddy restart, worker crash recovery, outbox retry/backoff, and cleanup against staging.
4. Add integration/E2E coverage for every write-route group and all 15 forms; focus on upload, RBAC, OTP/session revoke, concurrent vouchers, `429`, keyboard/focus, and offline failures.
5. Audit the remaining lower-risk legacy admin write forms for canonical Zod field schemas and uniform field-level error UX.
6. Re-run DB query plans under load and add only benchmark-supported indexes.
7. Review root scratch/debug artifacts separately; preserve them until the owner authorizes removal.

## Known risks and blockers

- Capacity is not certified until the full k6 release gate passes.
- CAPTCHA enforcement depends on production site/secret keys and allowed hostnames; a missing or mismatched configuration can block real users.
- Search webhook updates depend on a shared strong `SEARCH_WEBHOOK_SECRET`.
- MySQL shares the target host with the applications. If CPU/RAM/pool/SLO targets fail, separate MySQL or add another host.
- The database still mixes InnoDB and MyISAM and mostly contains legacy latin1 data; transaction/encoding behavior cannot be assumed across all old tables.
- Shared validation/security foundations cover the highest-risk routes, but the project should not claim every legacy admin field has been converted to canonical Zod without a route-by-route follow-up audit.

## Verification commands

Use the command blocks in `AGENTS.md`. Use `npm.cmd run local:healthcheck` and `npm.cmd run local:benchmark` from `web-admin` while both apps are running. Use `npm.cmd run load:k6` only against an approved isolated target.
