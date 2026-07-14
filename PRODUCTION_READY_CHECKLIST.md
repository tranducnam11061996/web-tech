# Production Readiness Checklist

Last updated: `2026-07-15`

Do not deploy until every applicable item is complete and evidence is retained.

## Secrets, access, and data

- [ ] Rotate database, SMTP, admin/session, CAPTCHA, webhook, and any previously exposed credentials.
- [ ] Store production secrets outside Git; verify example env files contain placeholders only.
- [ ] Configure exact `STOREFRONT_ORIGIN`, CAPTCHA allowed hostnames/actions, strong `SEARCH_WEBHOOK_SECRET`, secure cookies, and trusted proxy behavior.
- [ ] Back up MySQL and restore into a disposable database before migrations; preserve/verify SHA-256 and critical counts using `web-admin/database-docs/DATABASE_TRANSFER.md`.
- [ ] Confirm RBAC, write gate, audit logs, password/session rotation, admin login throttling, and direct API `401`/`403` behavior.

## Database and runtime

- [ ] Apply additive migrations with the explicit write flag; verify readiness and all required tables/indexes afterward.
- [ ] Confirm import run state and the external recovery boundary. Accepted runs 2–8 have closed rollback windows and no in-database recovery tables; protect and restore-test the documented external artifacts.
- [ ] Configure Caddy TLS/HTTP2/compression, request body limits, security headers, route-specific timeouts, and overwritten forwarding headers.
- [ ] Run two API workers with at most 12 DB connections each, one storefront worker, and one background worker.
- [ ] Reserve at least 30% of MySQL connections for operations; enable slow-query logging and monitor pool queue/timeouts.
- [ ] Verify graceful deployment, process restart, health/readiness removal, cache prewarm, outbox retry/backoff, and cleanup batching.
- [ ] Verify media path containment, MIME/signature limits, filesystem permissions, storage capacity, and backup policy.

## Security and user journeys

- [ ] Verify origin/CORS, CSP/HSTS/security headers, request IDs, safe error envelopes, `Retry-After`, and no raw exception disclosure.
- [ ] Run reCAPTCHA in shadow mode, inspect action-specific score/hostname/challenge metrics, then approve enforcement thresholds.
- [ ] Test order replay/different-payload conflict, concurrent voucher use, transaction rollback, OTP cooldown/lock, session revoke, webhook replay, and upload rejection.
- [ ] Complete mobile/desktop and keyboard/screen-reader checks for all 15 forms, including `429`, CAPTCHA failure, lost network, and retry without data loss.

## Load and release gate

- [ ] Restore green frontend regression/release JS budgets; the `2026-07-15` build exceeds limits on product, cart, checkout, and combo-checkout.
- [ ] Obtain a controlled full Playwright result against a stable runtime; the latest 12-worker local run was resource-inconclusive.
- [ ] Run `npm.cmd run load:k6` on an isolated 8 vCPU/16 GB production-like host using the documented traffic mix and full ramp/hold duration.
- [ ] Require error rate <0.5%, public read p95 <300 ms/p99 <800 ms, quote p95 <500 ms, and order p95 <1.5 s excluding email.
- [ ] Require no duplicate orders, no oversold vouchers, CPU sustained <75%, at least 20% free RAM, no pool timeout, and no hot MySQL query >500 ms.
- [ ] Require LCP p75 <2.5 s, INP <200 ms, and CLS <0.1 from production-like frontend measurement.
- [ ] Store test scripts, results, host configuration, application logs, pool metrics, and MySQL slow-query evidence with the release record.

If the single-host target misses these criteria, mark a capacity blocker and separate MySQL or add a second host. Do not lower the criteria to pass.
