# New Machine Setup and Continuation Runbook

Last verified: `2026-07-15`

This runbook is the shortest safe path for continuing HACOM development on another Windows machine. It transfers three separate things: Git content, the current uncommitted working tree, and ignored runtime data/secrets. A Git clone alone is not a complete transfer.

## 1. Freeze and inventory the source machine

From `D:\web-tech`:

```powershell
git branch --show-current
git rev-parse HEAD
git status --short
git diff --check
```

Expected committed baseline at this audit is branch `main`, HEAD `6d3db1d289c04ee50881d1f3112c9c6c495ac39c`, synchronized with `origin/main`. The source working tree is dirty and contains active implementation work. Do not run reset/checkout/clean commands.

Preferred transfer: review and commit the intended feature bundle, then push it. If it must remain uncommitted, create and securely transfer both:

```powershell
git diff --binary HEAD > D:\safe-transfer\web-tech-working-tree.patch
git ls-files --others --exclude-standard > D:\safe-transfer\web-tech-untracked-files.txt
```

`git diff` does not include untracked files. Copy every path listed in `web-tech-untracked-files.txt` while preserving its relative path. Verify the patch and copied files on the destination before deleting the source copy.

Also transfer ignored assets separately:

- current database SQL/ZIP and checksum files from the approved backup location;
- required uploaded media under the configured `MEDIA_ROOT`;
- environment secrets through an approved encrypted channel;
- any local-only migration/import artifacts that are still part of the recovery boundary.

Never put database archives, `.env` files, credentials, or customer data into Git.

## 2. Install the verified toolchain

The latest audit ran with:

- Windows and PowerShell;
- Git `2.54.0.windows.1`;
- Node.js `24.15.0` and npm `11.12.1`;
- MySQL `8.4.3` for the accepted local database/restore path.

Use the same versions when practical. A different MySQL or MariaDB version requires a disposable compatibility restore before it can own `it_tech_db`. Caddy and PM2 are optional for local development but required to reproduce the supplied one-host production topology.

## 3. Clone and restore source state

```powershell
git clone <approved-repository-url> D:\web-tech
cd D:\web-tech
git checkout main
git rev-parse HEAD
```

If the active work was committed, pull the intended commit. If an uncommitted patch was transferred:

```powershell
git apply --check D:\safe-transfer\web-tech-working-tree.patch
git apply D:\safe-transfer\web-tech-working-tree.patch
```

Then copy the untracked files into the same relative paths and compare `git status --short` with the source-machine inventory.

`search-tool` is a historical Git link with no committed `.gitmodules` entry. An empty/unavailable `search-tool` directory does not block the production applications; production search is in `web-admin`.

## 4. Install application dependencies

Do not copy `node_modules` or `.next` between machines.

```powershell
cd D:\web-tech\web-admin
npm.cmd ci

cd D:\web-tech\font-end
npm.cmd ci
```

The root `package.json` is not an application workspace. Runtime development and verification commands belong in `web-admin` or `font-end`.

## 5. Recreate ignored environments

Create `D:\web-tech\web-admin\.env` from sanitized examples and the approved secret store. At minimum it must identify the restored database and begin with writes disabled:

```env
DATABASE_URL=mysql://<user>:<password>@127.0.0.1:3306/it_tech_db
ADMIN_WRITE_ENABLED=false
NEXTAUTH_SECRET=<strong-secret>
NEXTAUTH_URL=http://localhost:3000
STOREFRONT_ORIGIN=http://localhost:3001
```

Also configure SMTP, CAPTCHA, metrics, search webhook, media, pool, and worker variables needed by the journeys being tested. `RECAPTCHA_DEVELOPMENT_BYPASS=true` is local-development-only and must never be used in production.

Create `D:\web-tech\font-end\.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
API_INTERNAL_URL=http://localhost:3000
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
```

Never place `DATABASE_URL`, SMTP credentials, CAPTCHA secret, webhook secret, or admin/session secrets in the storefront environment. `NEXT_PUBLIC_*` values are compiled into browser bundles.

For standalone `tsx` database scripts, prefer `web-admin/.env` or explicit process environment; do not assume every script loads `.env.local` the same way Next.js does.

## 6. Restore the database and media

Follow `web-admin/database-docs/DATABASE_TRANSFER.md` exactly. The canonical path uses MySQL command-line tools, checksum verification, a disposable restore trial, and explicit object/count checks.

Current accepted post-favorites target expectations are:

- 289 tables: 161 InnoDB and 128 MyISAM;
- 1 routine and 2 triggers;
- 788 categories, 90 brands, 4,712 products, and 4,712 search rows;
- zero Latin-1/utf8mb3 columns;
- zero importer recovery/stage/restore tables;
- `web_admin_customer_favorites` present.

These are verification expectations, not authorization to overwrite an existing database. Back up and identify any existing target first. Keep applications and workers stopped during the consistent mixed-engine export/import window.

Restore media into the configured `MEDIA_ROOT`, preserve its relative paths and permissions, and verify that `/api/media/[...path]` cannot escape that root.

## 7. Start local services

Start MySQL first and verify that it listens on the host/port used by `DATABASE_URL`.

```powershell
cd D:\web-tech\web-admin
npm.cmd run dev
```

`web-admin npm run dev` starts the Next.js admin/API process plus the background worker. In another terminal:

```powershell
cd D:\web-tech\font-end
npm.cmd run dev
```

Verify:

```text
http://localhost:3000/api/health/live
http://localhost:3000/api/health/ready
http://localhost:3001/
```

Readiness must be 200 before database-backed smoke tests. A 503 with both Next.js ports still listening usually means the database/migration dependency is unavailable; inspect the safe readiness response and process logs without printing credentials.

## 8. Run the continuation gate

Run the complete matrix from `AGENTS.md` in both applications. Then, while the runtime is healthy:

```powershell
cd D:\web-tech\web-admin
npm.cmd run local:healthcheck
$env:LOCAL_HEALTHCHECK_EMPTY_CATALOG='true'
npm.cmd run local:healthcheck
Remove-Item Env:LOCAL_HEALTHCHECK_EMPTY_CATALOG
```

The accepted catalog has no collection data. Therefore strict health currently expects the two configured collection probes to fail with 404, while the explicit empty-catalog mode should reach 15/15.

Also run from `font-end` after a production build:

```powershell
npm.cmd run perf:budget
npm.cmd run perf:budget:release
$env:PLAYWRIGHT_NO_SERVER='1'
npx.cmd playwright test --workers=1
Remove-Item Env:PLAYWRIGHT_NO_SERVER
```

At the latest audit, multiple JS budgets failed and the full high-concurrency browser run was resource-inconclusive. Do not declare the destination equivalent until these are rerun and any reproducible failures are classified.

## 9. Handoff checklist

- [ ] Destination commit and `git status --short` match the intended source state.
- [ ] No secrets or database archives appear in `git status`.
- [ ] Database archive and extracted SQL checksums match the source record.
- [ ] Disposable restore and current target verification pass.
- [ ] `ADMIN_WRITE_ENABLED=false` before application startup.
- [ ] MySQL, readiness, storefront, and worker are healthy.
- [ ] Both application typecheck/lint/test/build gates pass.
- [ ] Healthcheck results are recorded with and without the empty-catalog allowance.
- [ ] Browser and performance-budget results are recorded honestly.
- [ ] Full staging k6 remains pending unless executed on an approved production-like host.
