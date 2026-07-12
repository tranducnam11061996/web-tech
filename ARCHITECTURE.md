# HACOM Architecture

Last verified: `2026-07-13`

## System boundaries and runtime

### Combo commerce flow

The storefront product-detail payload receives only active combo-set/group summaries. Group products are lazy-loaded from `GET /api/combo-sets/[setId]/groups/[groupIndex]`; all displayed totals and order writes are based on server-side `POST /api/combo-cart/quote` repricing. The browser’s separate `hacom.combo-cart.v1` record contains only anchor/set/revision and product IDs, group indexes, and quantities. `POST /api/combo-orders` locks and re-quotes inside the order transaction, stores an immutable allocation snapshot, and marks metadata as `order_type=combo`.

```mermaid
flowchart LR
  Browser["Customer or admin browser"] --> Caddy["Caddy: TLS, compression, limits, security headers"]
  Caddy --> Store["Storefront worker\nNext.js 16 :3001"]
  Caddy --> API1["web-admin worker 1\nNext.js 16 :3000"]
  Caddy --> API2["web-admin worker 2\nNext.js 16 :3000"]
  Store --> API1
  Store --> API2
  API1 --> MySQL["MySQL legacy + web_admin_* tables"]
  API2 --> MySQL
  Worker["Background worker\noutbox + cleanup"] --> MySQL
  API1 --> Media["MEDIA_ROOT"]
  API2 --> Media
```

- `web-admin` owns all MySQL access, public/admin/customer APIs, admin UI, media serving, and background jobs.
- `font-end` owns the customer UI and calls `web-admin`; it never receives DB credentials.
- `search-tool` is a historical prototype. Production search is part of `web-admin`.
- PM2 configuration starts two API/admin workers, one storefront worker, and one background worker. Each API worker defaults to a 12-connection pool with bounded queue/connect timeouts.
- Liveness checks the process. Readiness checks DB connectivity and required performance tables.

## Public read flow and cache

```mermaid
sequenceDiagram
  participant B as Browser/storefront
  participant A as API worker
  participant C as Worker-local cache
  participant V as web_admin_cache_versions
  participant D as MySQL
  B->>A: GET product/menu/homepage/search
  A->>V: Poll version periodically
  A->>C: Normalized bounded cache key
  alt Fresh or stale-while-rebuild value
    C-->>A: Reduced public payload
  else Cache miss
    A->>D: Bounded query/parallel reads
    D-->>A: Runtime data
    A->>C: Store bounded result
  end
  A-->>B: ETag + cache headers, or 304
```

- Menu, banner, homepage, product, category, and search routes return runtime-only fields.
- Product/news detail and category payloads carry a bounded root-to-leaf `categoryTrail`; the storefront renders it with one shared semantic breadcrumb component and does not issue a follow-up breadcrumb request.
- Product-detail payloads carry server-resolved similar products and related articles. Recently viewed IDs/snapshots remain in browser `localStorage`; the client performs one bounded batch refresh through `/api/products?ids=...`, while checkout continues to requote all prices server-side.
- Product-detail payloads carry up to 50 currently active, non-exhausted voucher summaries that apply globally or through a selected category ancestor. These summaries are discovery data only; cart quote and order creation re-check time, quota, minimum order, eligible items, and current prices.
- Product-detail payloads also carry up to 50 display-only product promotions. A promotion matches a direct SKU or any product category ancestor, is deduplicated with `EXISTS`, and is ordered by manual priority, nearest end time, then newest id. These records never enter cart quote or order logic.
- Product-detail payloads normalize up to 20 legacy PHP-serialized `video_code` entries into public `{ id, embedUrl, description }` YouTube-only records and expose `hasSpecifications` for meaningful specification HTML. Raw legacy video data never leaves `web-admin`; invalid/off-domain/duplicate entries are omitted, and the storefront mounts only the active modal iframe.
- Product and product-category slug payloads optionally carry one bounded entity-specific buying guide. It is loaded only on the detail route, never on product lists/search/homepage/news, and uses the dedicated `public_catalog_details` cache version for selective invalidation.
- Product detail optionally carries one bounded `productGroup` resolved from `config_group`, its ordered attributes/values, and sellable product rows. Each card's thumbnail is resolved in that query path from `idv_sell_product_store.proThum`, then parsed from legacy `image_collection` if needed; Product Group values no longer have image/color columns or API fields. PHP-serialized mappings are normalized defensively; malformed/orphan/inactive/zero-price/slugless rows are omitted. The storefront makes no follow-up variant request, and group mutations invalidate only catalog-detail caches.
- Search and other expensive refreshes use single-flight behavior so one worker rebuilds once per cache key.
- Admin mutations bump a DB-backed cache version. Other workers observe it and clear their local cache.
- Query, filter count, page, limit, product count, and cart cardinality are bounded to protect CPU, memory, and cache-key growth.

## Checkout, voucher, and email flow

```mermaid
sequenceDiagram
  participant F as Checkout UI
  participant A as POST /api/orders
  participant R as reCAPTCHA/rate limit
  participant D as MySQL transaction
  participant W as Background worker
  F->>F: Generate UUID Idempotency-Key
  F->>A: Validated order + CAPTCHA + key
  A->>A: Body/origin/schema/honeypot checks
  A->>R: Verify action + consume IP/identity buckets
  A->>D: Begin only after pre-DB checks
  D->>D: Claim idempotency and quote once
  D->>D: Lock voucher row FOR UPDATE
  D->>D: Insert order + bulk items + customer link/metrics
  D->>D: Enqueue email + persist replay response
  D-->>A: Commit
  A-->>F: Order response with request ID
  W->>D: Claim pending outbox entry
  W->>W: Send email with retry/backoff
```

- Client price, voucher state, customer ID, payment state, and ownership data are never authoritative.
- `Idempotency-Key` is required. Same key/same payload replays the stored response; same key/different payload returns `409`.
- Voucher quota and redemption share the order transaction. Limited vouchers cannot decrement below zero.
- Email is outside request latency but its outbox record is committed atomically with the order.

## Customer authentication and forms

- Registration stores a short-lived challenge and hashed OTP; a customer row is created only after verification.
- Login reads Argon2id and legacy bcrypt hashes. Successful bcrypt login opportunistically upgrades the stored hash.
- Customer sessions store hashed tokens, absolute expiry, idle window, and sliding idle expiry. Session touch is throttled.
- Anonymous high-risk actions use action-specific reCAPTCHA v3, honeypot/minimum-fill signals, and atomic rate-limit buckets by IP plus hashed identifier.
- Authenticated customer writes require session/origin checks and rate limits; CAPTCHA is reserved for anomalous/step-up behavior.
- Admin writes require session, RBAC, same-origin handling, audit logging, and the write gate. Admin login adds account/IP throttling and risk-based CAPTCHA.

## API and error contract

Public write failures use:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable Vietnamese message",
    "fields": { "email": "Field-specific message" },
    "requestId": "request-correlation-id"
  }
}
```

- Every response should include `X-Request-ID`; `429` also includes `Retry-After`.
- Order creation additionally requires `Idempotency-Key` and `recaptchaToken`.
- Signed search webhook requires `X-Webhook-Timestamp`, `X-Webhook-Nonce`, and `X-Webhook-Signature`.
- Public CORS is restricted to the configured storefront origin; preflight does not emit wildcard origins.

## Database model

- Legacy catalog/content/order tables remain canonical where already used. Most are `latin1_swedish_ci`, and 128 tables remain MyISAM.
- New transactional/security/runtime state lives in additive InnoDB `web_admin_*` tables.
- No code should assume a physical FK exists between legacy tables.
- Search uses `product_data_search` plus the normalize function, insert/update triggers, and FK to products.
- Customer, voucher, product-promotion, idempotency, outbox, rate-limit, cache-version, and webhook-nonce state is transactional InnoDB.

The configured database snapshot on `2026-07-12` contains 282 tables: 154 InnoDB and 128 MyISAM after the buying-guide migration. See `web-admin/database-docs/DATABASE_SCHEMA.md` for the current schema handoff.

## Media security

- Uploads are stored under `MEDIA_ROOT/ddMMyyyy/random-name.ext` and served through `/api/media/[...path]`.
- Routes enforce size/extension/MIME/signature rules and ensure the resolved path stays under `MEDIA_ROOT`.
- Product image metadata synchronizes to legacy thumbnail/collection/count fields until all consumers migrate.

## Performance and release targets

- Target host: one 8 vCPU/16 GB server running apps and MySQL.
- Target usage: 1,500 online sessions, peak 150 RPS, up to 10 checkouts/s.
- SLOs: public read p95 <300 ms, quote p95 <500 ms, order p95 <1.5 s excluding email, error rate <0.5%.
- Frontend: LCP p75 <2.5 s, INP <200 ms, CLS <0.1.
- The full production-like k6 test remains mandatory. Local benchmarks and health checks do not certify capacity.
