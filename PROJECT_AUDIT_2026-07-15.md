# Whole-Workspace Audit — 2026-07-15

This report records what was inspected and verified on the current working tree. `AI_HANDOFF.md` remains the canonical continuation guide; this file is evidence and diagnosis, not a second source of mutable project state.

## Audit scope

- Git branch, HEAD, status, diff statistics, tracked/untracked inventory, and documentation consistency.
- Root deployment/configuration assets and environment-variable usage.
- `web-admin` routes, scripts, tests, database ownership, migration/import documentation, menus, attributes, search/cache, commerce/customer, and operational boundaries.
- `font-end` routes, environment boundary, dynamic catalog/account/commerce surfaces, browser tests, and performance budgets.
- Database schema/transfer runbooks and accepted backup/restore evidence.
- Required compile/lint/test/build matrix, npm security audit, local health checks, focused/full Playwright runs, and JS budgets.

No application code, schema, or database data was changed by this documentation audit.

## Repository snapshot

- Branch: `main`.
- HEAD: `6d3db1d289c04ee50881d1f3112c9c6c495ac39c`, synchronized with `origin/main` at the start of audit.
- The working tree already contained a substantial uncommitted feature bundle. The audit preserved it.
- Approximate source inventory from Git plus untracked files: 351 TypeScript files, 226 TSX files, 201 JavaScript files, 46 CSS files, and 20 Markdown files before this report/runbook were added.
- Main tracked areas: about 690 paths under `web-admin` and 183 under `font-end`; much of the JavaScript under `web-admin/public` is the locally bundled TinyMCE distribution.
- `search-tool` is stored as a Git link (`160000`) but the root has no `.gitmodules`; it is historical and not needed by the production runtime.
- Root-level historical/scratch artifacts (`original.tsx`, `temp.tsx`, debug JSON, patch/helper scripts, `fusionkit`, and customer reference screenshots) are outside the two application build graphs. They should be classified or archived in a future hygiene pass, but were not deleted.
- `font-end/tsconfig.tsbuildinfo` is tracked and changes during typechecking. This creates recurring working-tree noise; removing it from tracking is a future repository-hygiene decision, not part of this audit.

## Architecture conclusion

The application boundary is clear and remains intact:

```text
browser -> font-end :3001 -> web-admin APIs :3000 -> MySQL it_tech_db
                                  |
                                  +-> MEDIA_ROOT
                                  +-> background worker / SMTP
```

Only `web-admin` owns MySQL. The storefront code uses API origins and no database client was found in its package dependencies. Production search, caching, webhook, customer, commerce, media, and admin logic live in `web-admin`; `search-tool` is not runtime code.

## Current feature-state conclusion

The committed baseline already includes the PCMarket catalog/news cutover, customer accounts/favorites, hardened commerce, dynamic storefront, admin/RBAC, cache/search, deployment assets, and guarded database workflows.

The uncommitted bundle adds or finalizes:

- real admin attribute CRUD and canonical value ApiKeys;
- shared category filter eligibility/resolution;
- Footer and Bottom Footer managed menus;
- category SEO-title fallback and removal of the duplicate category text search;
- mega-menu placement behavior/tests;
- offline TinyMCE toolbar/menubar polish.

The active catalog intentionally lacks approved collections, combo sets, product groups, vouchers, promotions, buying guides, and modern product-image rows. Empty UI/404 behavior for those data-driven surfaces is not evidence that their code is missing.

## Documentation findings before correction

- Root `README.md` still described 89 brands, 342 tables, retained recovery tables, and 66 unit tests.
- `AI_HANDOFF.md` named committed HEAD `6814c34` although current HEAD is `6d3db1d`; it also stated both 288 and 289 as the current table total.
- `PROJECT_PROGRESS.md`, app READMEs, and security/load docs retained older Playwright and JS-budget results.
- `ADMIN_MIGRATION_GUIDE.md`, `QUICK_REFERENCE.md`, and `STATISTICS.md` contained pre-cleanup table/collation claims even though the accepted schema is post-cleanup plus the favorites table.
- `DATABASE_TRANSFER.md` expected the pre-favorites 288-table schema in its mandatory current-state query.
- The working tree and ignored database artifacts were not clearly separated in the machine-transfer instructions, creating a risk that a fresh clone would silently lose active work and recovery material.
- Environment usage is broader than any single app example file: optional importer, benchmark, Playwright, Lighthouse, and media overrides exist in code/scripts. The new-machine runbook therefore treats examples as sanitized starting points and requires command-specific documentation review rather than claiming one example is exhaustive.

The documentation pass corrected the canonical/stateful files and added `NEW_MACHINE_SETUP.md`.

## Verification evidence

### Required application matrix

| Application/check | Result |
|---|---|
| `web-admin` `npx.cmd tsc --noEmit` | Pass |
| `web-admin` ESLint `--quiet` | Pass |
| `web-admin` unit tests | 104/104 pass |
| `web-admin` integration tests | 6 pass, 7 skipped by explicit fixture/safety gates |
| `web-admin` production build | Pass; 114 static/dynamic route entries generated |
| `font-end` `npx.cmd tsc --noEmit` | Pass |
| `font-end` ESLint `--quiet` | Pass |
| `font-end` production build | Pass; 18 route entries generated |
| npm audit in both apps | 0 known vulnerabilities |

The skipped destructive attribute/importer tests were not forced against `it_tech_db`; this is correct safety behavior.

### Runtime

- Initial probes returned HTTP 200 for liveness, readiness, and storefront.
- Strict `local:healthcheck` returned 13/15: API collection and storefront collection both returned 404 because the accepted database has no collection data.
- With `LOCAL_HEALTHCHECK_EMPTY_CATALOG=true`, the same runtime returned 15/15.
- Published Footer and Bottom Footer public endpoints returned real version-2 database payloads, not fallback data: four Footer groups/26 links and one Bottom Footer group/19 links.
- After the high-concurrency Playwright run, ports 3000/3001 still listened but no MySQL process listened on 3306; readiness returned 503 and uncached DB endpoints failed. The audit did not start/modify the database service. Runtime verification must be repeated after MySQL is restarted and identified.

### Browser tests

- Full default run: 76 tests, 44 passed, 4 skipped, 28 failed.
- The run used 12 workers against the already-running local development server and produced `ERR_INSUFFICIENT_RESOURCES`, navigation timeouts, missing trace artifacts, and cascading selector failures. Treat it as environment/resource-inconclusive, not as 28 confirmed product regressions.
- Focused category-title and mega-menu specs rerun with one worker: 8 passed and 2 expected project/device skips.
- Next action: rerun the whole suite against a stable runtime with a controlled worker count; only then triage reproducible failures.

### Frontend JavaScript budgets

Current referenced route JavaScript after the audited production build:

| Route | Size | Regression limit | Release limit | Result |
|---|---:|---:|---:|---|
| Product detail | 236.8 KB | 235 KB | 205 KB | Fails both |
| Cart | 175.5 KB | 174 KB | 170 KB | Fails both |
| Checkout | 190.8 KB | 174 KB | 170 KB | Fails both |
| Combo cart | 167.7 KB | 174 KB | 170 KB | Passes both |
| Combo checkout | 187.4 KB | 174 KB | 170 KB | Fails both |

This supersedes older documentation that described the regression budget or most commerce release budgets as passing.

## Risks and release blockers

1. The active uncommitted work and ignored recovery artifacts will not survive a normal clone unless transferred deliberately.
2. MySQL/runtime readiness was unavailable at audit end and must be restored before continued DB-backed work.
3. Four of five measured frontend routes exceed at least the regression budget; four exceed the strict release budget.
4. The full browser suite does not currently have a clean, controlled result for this working tree.
5. Full read/commerce/abuse k6 scenarios have not run on the target-like 8-vCPU/16-GB staging host; 1,500-user capacity is unproven.
6. Production CAPTCHA, SMTP, origin/proxy, TLS/cookies, metrics/webhook secrets, worker recovery, database pool/headroom, and destination restore compatibility remain deployment gates.
7. Legacy MyISAM tables remain. Transactions must follow actual engine boundaries and compensation/staging designs.
8. PCMarket variant/config/comboset records remain audit-only because complete source definitions are unavailable.
9. Legacy admin routes still need route-by-route canonical validation, RBAC, error-envelope, accessibility, and upload review.

## Recommended continuation order

1. Protect/commit or patch-transfer the current working tree and copy ignored database/media/secrets safely.
2. Restore MySQL readiness and repeat runtime/database assertions.
3. Fix JS-budget regressions.
4. Run the browser suite with one or a small controlled number of workers and classify stable failures.
5. Complete admin write-route/security/accessibility parity.
6. Restore-test on the destination MySQL version and verify application startup there.
7. Execute the production-like k6 release gate and retain evidence.
