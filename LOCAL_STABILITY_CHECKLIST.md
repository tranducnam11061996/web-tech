# Local Stability Checklist

Use this checklist before merging a meaningful feature and before deciding that the local environment is ready for staging.

## Start and verify

1. Start MySQL, then start `web-admin` on port 3000 and `font-end` on port 3001.
2. Run `npm run db:indexes` from `web-admin` once after a fresh local database restore.
3. Run `npm run db:explain-hot` from `web-admin`; review plans for unexpected full table scans on the hot routes.
4. Run `npm run local:healthcheck` from `web-admin` while both applications are running.
5. Run `npm run build` in `web-admin` and `font-end` before a major merge.

## Manual smoke coverage

- Home, a large category, root product/category slug, product detail, search, and collection detail.
- Price filters, sorting, pagination, cart quote, and checkout validation. Use a test customer only; do not create production-like orders during routine smoke checks.
- Admin product, category, collection, collection-product, and pagination flows.
- Desktop and a 375px viewport: no horizontal scroll, console errors, or broken keyboard focus.

## Local performance baseline

- Record response time for `/api/products`, `/api/search`, `/api/products/[slug]`, and `/api/collections/[slug]` after cold start and after warm cache.
- Keep the search cache TTL configurable with `SEARCH_CACHE_TTL_MS`; the default is five minutes to avoid repeated full in-memory rebuilds.
- Re-run `db:explain-hot` whenever a query, schema, or product-import job changes.
- Run a small repeat-request pass only after smoke tests pass. Keep it local and stop if database CPU or error rates rise unexpectedly.

## Secrets and local data

- Copy from `.env.example` into an ignored local `.env`; never put real credentials in example files.
- Rotate credentials that were previously committed before any internet-facing deployment.
- Do not commit `.next`, `node_modules`, database exports, screenshots containing customer data, or local environment files.
