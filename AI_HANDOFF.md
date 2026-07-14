# AI Handoff — HACOM Workspace

Last verified: `2026-07-15`

This is the canonical current-state handoff. Read in this order:

1. `AGENTS.md`
2. this file
3. `ARCHITECTURE.md`
4. `PROJECT_PROGRESS.md`
5. the README for the application being changed
6. `web-admin/database-docs/DATABASE_SCHEMA.md` for database work
7. `NEW_MACHINE_SETUP.md` and `web-admin/database-docs/DATABASE_TRANSFER.md` for a new machine

Use `PROJECT_AUDIT_2026-07-15.md` for the evidence and findings from the latest whole-workspace audit. Historical implementation detail remains in `CHANGELOG.md`; do not treat old counts in changelog entries as the current state.

## Repository state

- Repository: `tranducnam11061996/web-tech`.
- Branch: `main`.
- Committed HEAD: `6d3db1d289c04ee50881d1f3112c9c6c495ac39c` (`feat: complete storefront favorites and validation`), synchronized with `origin/main` at audit time.
- The working tree is intentionally dirty. It contains the uncommitted attribute-management/filter work, managed Footer/Bottom Footer menus, category SEO-title cleanup, mega-menu positioning, TinyMCE polish, tests, and documentation updates described below.
- Never reset, discard, or overwrite the working tree. Inspect `git status --short` and relevant diffs before editing.
- A fresh clone contains only HEAD and will not contain this uncommitted feature bundle. Commit it or transfer a patch plus untracked files before moving machines; follow `NEW_MACHINE_SETUP.md`.
- `search-tool` is a historical Git link/reference, not the production search implementation. It has no committed `.gitmodules` entry and must not be treated as a required runtime dependency.

## Ownership and runtime boundaries

- `web-admin` owns the admin UI, all public/admin/customer APIs, MySQL access, migrations/importers, uploaded-media serving, and the background worker.
- `font-end` owns the customer storefront. It consumes `web-admin` APIs and must never import a database client or receive database credentials.
- `search-tool` is historical only. Production search is in `web-admin`.
- Uploaded media lives under the external `MEDIA_ROOT` and is served by `web-admin /api/media/[...path]`.
- Local topology: `web-admin :3000`, `font-end :3001`, plus one background-worker process. The supplied production topology uses Caddy, two clustered API workers, one storefront worker, and one background worker.

## Current uncommitted feature bundle

The current working tree implements and documents the following related changes:

- Admin attribute list/create/edit/delete/bulk-status flows backed by the real legacy attribute tables.
- Transactional value/category reconciliation and cascade cleanup. Destructive integration coverage remains gated to an explicitly disposable database.
- Canonical `idv_attribute_value.api_key` values. All 426 accepted live values were backfilled; public category/search filtering uses the stored key rather than rebuilding a slug from the label.
- Shared category-attribute resolution: active Global attributes apply broadly; Local mappings are preferred; unmapped Local values are exposed only when an enabled product in the enabled category/descendant scope actually uses the value.
- Managed `footer` and `bottom_footer` draft/publish menus with admin screens, RBAC/write gates, public ETag endpoints, cache invalidation, and storefront fallback data.
- Published Footer data: four groups and 26 links. Published Bottom Footer data: one `Trusted Partners` group and 19 links. Current seeded links use `#`.
- Category headings/document titles reject blank or shorter-than-five-character legacy SEO titles such as `0` and fall back to the category name. The category control bar retains sorting and removes its standalone search field.
- Desktop/mobile header mega-menu placement regression coverage.
- Shared offline GPL TinyMCE remains locally bundled and loaded only inside `RichTextEditor`; its menu/toolbar layout and promotion suppression were polished without moving it to the root layout or Tiny Cloud.

The exact modified/untracked file list is intentionally not duplicated here because it changes during work. `git status --short` is authoritative.

## Accepted database state

- Active local database: `it_tech_db`.
- Retained legacy source: `hanoi23_db`; do not modify it during current work.
- Accepted post-favorites schema: 289 physical tables, 161 InnoDB and 128 MyISAM, 1 routine, 2 triggers, zero Latin-1/utf8mb3 columns, and zero importer recovery/stage/restore tables.
- Catalog: 788 categories; 90 brands; 4,712 product/store/price/info/search rows; 14,455 product-category links; 17,603 product-attribute links; 162 category-attribute links.
- News: 4 categories, 668 articles/content rows, and 705 unique article-category links. Source article 83 remains quarantined. Source IDs 682 and 683 were detected later but have not been imported.
- PCM is brand ID 96. Durable source maps include `0 -> 96`, `34 -> 25`, and `57 -> 31`. PCM owns 2,276 products, 849 enabled.
- The active catalog still has no approved combo-set, product-group, collection, voucher, product-promotion, buying-guide, or modern product-image rows. The favorites table was created empty and may contain user-created rows later.
- Runs 2–8 are accepted and rollback-closed. Their in-database recovery tables were removed; recovery depends on protected external restore-verified artifacts.
- The last accepted post-favorites schema facts are documented in `web-admin/database-docs/DATABASE_SCHEMA.md`. Re-query the target before a write or migration; never use these counts as permission to mutate an unidentified database.

At the end of the `2026-07-15` audit, ports 3000 and 3001 still listened but the MySQL process was no longer listening on 3306, so `/api/health/ready` returned 503 and uncached database APIs failed. Earlier in the same audit, readiness was 200, database-backed integration tests passed, and healthcheck passed with the documented empty-catalog allowance. Restart/identify MySQL before further runtime or database work; do not enable `ADMIN_WRITE_ENABLED` merely to recover readiness.

## Implemented product surface

- Dynamic homepage, product/category/brand/collection/search/news/cart/checkout/account/favorites pages.
- Server-authoritative cart quote and order creation with origin/body/rate/CAPTCHA/idempotency controls, transactional voucher/order/customer/outbox writes, and safe error envelopes.
- Customer registration, verification, login/logout, reset/change password, sessions, addresses, order history, and favorites.
- Product detail supports sanitized descriptions/specifications, product groups, videos, vouchers, promotions, buying guides, recommendations, related news, responsive specification height, description/summary disclosure, and cached-image hydration recovery.
- Public list/search/category paths show enabled products; direct inactive product detail remains addressable with inactive state, while inactive categories return 404.
- Admin auth/RBAC/audit plus product/category/article/attribute/menu/banner/collection/group/combo/promotion/voucher/customer/order/user/role surfaces. Some older screens still need route-by-route API/validation/UX parity review.
- Bounded public reads, ETags, worker-local caches, database cache versions, signed search webhook, internal metrics, health endpoints, validated media upload, and background outbox/expiry processing.

## Verification performed on the current working tree

On `2026-07-15`:

| Check | Current result |
|---|---|
| `web-admin` TypeScript / ESLint / production build | Pass |
| `web-admin` unit tests | 104/104 pass |
| `web-admin` integration tests | 6 pass, 7 correctly skipped by fixture/safety gates |
| `font-end` TypeScript / ESLint / production build | Pass |
| npm audit, both applications | 0 known vulnerabilities |
| Runtime health, strict mode | 13/15; both configured collection probes return 404 because collection data is absent |
| Runtime health with `LOCAL_HEALTHCHECK_EMPTY_CATALOG=true` | 15/15 while MySQL was available |
| Focused new Playwright coverage, one worker | 8 pass, 2 expected device/project skips |
| Full Playwright run, 12 workers | Inconclusive: 44 pass, 4 skipped, 28 fail amid `ERR_INSUFFICIENT_RESOURCES`, navigation timeouts, and cascading missing-element failures |
| Regression JS budget | Fail for product 236.8 KB, cart 175.5 KB, checkout 190.8 KB, combo-checkout 187.4 KB; combo-cart passes at 167.7 KB |
| Strict release JS budget | Fail for product, cart, checkout, and combo-checkout; combo-cart passes |
| Full 1,500-VU k6 release gate | Not run on a production-like host |

Do not repeat the older claims that the full Playwright suite or regression bundle budget is green. Re-run the full browser suite with controlled worker count and a stable production-like runtime before classifying individual failures.

## Environment and safety gates

- Secrets are ignored and must be transferred separately through an approved secure channel. Never commit `.env`, database archives, OTPs, hashes, tokens, credentials, or customer data.
- `web-admin/.env` or process environment must identify `it_tech_db`; start with `ADMIN_WRITE_ENABLED=false`.
- `font-end` needs `NEXT_PUBLIC_API_URL` and server-only `API_INTERNAL_URL`; it must not receive `DATABASE_URL`.
- Local CAPTCHA bypass is development-only and must be false in production.
- Production requires real CAPTCHA, SMTP, exact origins, webhook/metrics secrets, secure cookie/proxy settings, media storage, and bounded database pool configuration.
- Migrations/import applies/rollback/admin writes require `ADMIN_WRITE_ENABLED=true` plus operation-specific database/hash/confirmation guards. Return it to false immediately after an approved operation.
- Never run destructive importer or attribute CRUD tests against `it_tech_db` or `hanoi23_db`.

## Highest-priority next work

1. Preserve the dirty working tree and ignored database artifacts before changing machines; execute `NEW_MACHINE_SETUP.md` and restore-verify the destination database.
2. Restart/identify MySQL and re-establish `/api/health/ready=200`; then rerun strict and empty-catalog healthchecks.
3. Fix the current frontend JS regression/release budget failures and rerun the budget scripts after a clean production build.
4. Rerun the full Playwright suite with a controlled worker count and stable runtime; triage only reproducible failures.
5. Import missing variant/config-group/comboset definitions only after complete validated source exports exist.
6. Run read/commerce/abuse k6 scenarios on an approved production-like staging host and retain application/MySQL/host evidence.
7. Complete legacy admin write-route schema, RBAC, accessibility, and error-envelope audits.

## Required verification commands

Use the exact command blocks in `AGENTS.md`. When both applications and MySQL are healthy, also run:

```powershell
cd D:\web-tech\web-admin
npm.cmd run local:healthcheck
$env:LOCAL_HEALTHCHECK_EMPTY_CATALOG='true'
npm.cmd run local:healthcheck
Remove-Item Env:LOCAL_HEALTHCHECK_EMPTY_CATALOG
```

Use k6 only against an approved isolated staging host. Local checks are regression evidence, not a production-capacity claim.
