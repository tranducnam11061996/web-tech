# Security and Load Coverage Matrix

Last updated: `2026-07-13`

Status meanings: **Implemented** is present in code and locally checked; **Partial** needs route/form coverage or staging evidence; **Not verified** exists as a plan/script but has not passed the target environment gate.

| Endpoint/form group | Validation/body bound | Auth/origin | Abuse protection | CAPTCHA/idempotency | Status |
|---|---|---|---|---|---|
| Public catalog/menu/banner/homepage/search reads | Bounded query/page/filter/cache keys | Public read | ETag, cache, single-flight | N/A | Implemented |
| Product core/supplemental reads | Bounded slug/include; compatibility default remains full | Public read | ETag, byte-bounded SWR, negative TTL, cross-worker invalidation | N/A | Implemented locally |
| Web Vitals telemetry | Strict 2 KB batch and five known metrics; no PII fields | Storefront origin | 5% session sampling; operational signal is untrusted | N/A | Implemented locally |
| `POST /api/cart/quote` | Canonical cart schema, 50 items, qty 1–99 | Storefront origin | IP rate limit | No CAPTCHA by default | Implemented |
| `POST /api/orders` | Canonical bounded order schema | Storefront origin; optional customer session | IP + phone buckets, honeypot | `order_submit`; required `Idempotency-Key` | Implemented |
| `POST /api/combo-cart/quote` | Canonical set/revision/group/product/qty schema; server prices only | Storefront origin | IP rate limit | No CAPTCHA | Implemented locally |
| `POST /api/combo-orders` | Bounded combo-order schema; voucher absent/rejected by strict schema; transactional re-quote | Storefront origin; optional customer session | IP + phone buckets, honeypot | `combo_order_submit`; required `Idempotency-Key` | Implemented locally; staging migration/E2E pending |
| Customer register/login | Canonical identity/password schemas | Anonymous storefront | IP + identifier buckets, honeypot | `customer_register` / `customer_login` | Implemented |
| Customer verification/resend/reset | Canonical OTP/token/password schemas | Anonymous challenge/token | Cooldown, attempt locks, IP + identifier buckets | Action-specific CAPTCHA | Implemented |
| Customer profile/address/password | Canonical schemas on hardened routes | Customer session + origin/ownership | Customer/IP route buckets | Step-up only when anomalous | Implemented |
| Admin login | Bounded schema | Same-origin entry | IP + account throttling | Risk-based CAPTCHA | Implemented |
| Admin write APIs | Route payload checks vary by legacy module | Admin session, RBAC, write gate, audit | Session/account controls | No post-login CAPTCHA | Partial: shared auth exists; finish field-schema audit |
| Product-group admin/detail | 4 attributes, 50 values/attribute, 50 products; ownership/config validation | Admin session/RBAC/write gate; public detail read | Transaction locks, unique product assignment, bounded cached read | N/A | Implemented locally |
| Image uploads | Size, extension, MIME, binary signature, path containment | Admin session/RBAC/write gate | Request/body limits | N/A | Implemented on audited upload routes |
| Search webhook | Raw-body bound | HMAC secret | Timestamp window + one-use nonce | Signature required | Implemented |
| Customer/admin form accessibility | Browser metadata and selected field-error linkage | Matches endpoint | Pending state and retry handling | Submit-time token on risky forms | Partial: complete all 15-form E2E audit |

## Infrastructure and data controls

| Control | Implementation | Remaining verification |
|---|---|---|
| Request correlation | `X-Request-ID` and safe error envelope on hardened public writes | Extend/check every legacy route |
| Rate limiting | Atomic MySQL counters keyed by scope/hash, `Retry-After` | Tune production thresholds using metrics |
| Passwords/sessions | Argon2id new hashes, bcrypt upgrade, hashed tokens, sliding idle + absolute expiry | Production cookie/domain and revoke E2E |
| Order consistency | Single transaction, voucher row lock, bulk items, idempotency replay | Concurrent staging load |
| Email | Transactional outbox with worker retry/backoff | SMTP failure/recovery staging test |
| Cache coherence | Worker-local cache plus DB version invalidation | Two-worker mutation test under load |
| Runtime metrics | Token-protected route with safe route/cache/process/outbox metrics | Connect staging collector and retain the full k6 run |
| Webhook replay | HMAC SHA-256, ±5 minute timestamp, nonce table | Production secret rotation procedure |
| Reverse proxy | Caddy compression, body limits, timeouts, CSP/HSTS/security headers | Production TLS/domain validation |

## Load targets and current evidence

| Gate | Target | Current state |
|---|---|---|
| Online usage | 1,500 sessions, peak 150 RPS, up to 10 checkout/s | k6 script implemented; not target-tested |
| Public reads | p95 <300 ms, p99 <800 ms | Local warm observations are below target; not production proof |
| Quote/order | quote p95 <500 ms; order p95 <1.5 s excluding email | Functional/integration checks pass; load not verified |
| Correctness | <0.5% errors, no duplicate order, no oversold voucher | Idempotency test passes; concurrent voucher load pending |
| Host | CPU <75%, free RAM ≥20%, no pool timeout/hot query >500 ms | Not verified on target host |
| Web UX | LCP p75 <2.5 s, INP <200 ms, CLS <0.1 | Production-like measurement pending |
| JS budget | Product detail <=205 KB; commerce <=170 KB referenced route JS | Commerce passes; product detail is 219.9 KB (down from 233.6 KB) and remains a release blocker |

Run `web-admin/scripts/load-1500-users.js` only against an approved isolated staging host. Preserve the result bundle and treat any failed threshold as a release blocker.
