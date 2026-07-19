# Database Export, Restore, and Machine Transfer

Last verified: `2026-07-19`

This runbook transfers the complete active `it_tech_db` database to another machine. It preserves table definitions/data, mixed InnoDB/MyISAM engines, collations, the search routine, triggers, and import audit. Accepted runs 2-8 no longer have in-database recovery tables; their recovery boundary is the verified external artifacts below. `hanoi23_db` is out of scope and must remain untouched.

The current pre-catalog-live rollback boundary is `D:\web-tech\tmp\db-backups\it_tech_db-pre-pc-builder-v4-rehearsal-2026-07-19T09-15-57-655Z.json`, SHA-256 `657d673b5e7e8b938c54d867e8c3f972b6a087255d73e8846f594872db4efb25`. Its retained restore clone matched 303 tables/97,581 rows/one routine/two triggers and passed the v4 migration twice plus historical requote. Current live inventory after dropping the two verification tables is 301 tables (173 InnoDB/128 MyISAM).

## Current finalization artifacts

The current pre-PC-Builder rollback boundary is `D:\web-tech\tmp\db-backups\it_tech_db-pre-pc-builder-live-20260719003737.sql` (93,554,286 bytes), SHA-256 `f5f66f6c9916e0f995ba4b22c918188bd74a76e07cbe61f38a82feee1fb5db57`. It was restored into retained clone `it_tech_db_pc_builder_clone_20260719003737`, which matched 292 tables, catalog counts, one routine and two triggers before passing dedicated migration apply twice, verification, hard rollback and clean reapply. Live now has 302 tables; this archive intentionally predates the ten additive PC Builder tables and QA orders #20/#21.

The pre-page-view rollback boundary is `D:\web-tech\tmp\db-backups\it_tech_db-pre-page-view-tracking-2026-07-16T13-01-41-728Z.json` with SHA-256 `b2bfd6c86c21e89d326081e44b403049768244b624ae8f97acaae564674701de`. Its disposable restore matched 290 tables, 84,299 rows, 1 routine and 2 triggers before the additive two-table migration ran twice.

| Stage | Bundle / SHA-256 | Verified inventory |
|---|---|---|
| Pre-finalization | `it_tech_db-pre-pcm-finalization-2026-07-13T15-50-38-991Z.json` / `639935bccebf4d323b215aa6099add3696421ed5b4253605881d195b274b5ec6` | 352 tables / 156,881 rows; retained clone passed run-8 apply, rollback, re-apply, index and cleanup trial |
| Post-run-8, pre-cleanup | `it_tech_db-post-run8-pre-cleanup-2026-07-13T16-01-00-579Z.json` / `13339649231447567a6e499212076f8ff66c0f4ea0a2954e5b9e26fa3a401e27` | 362 tables / 194,067 rows; restore-verified manifest authorized live cleanup |
| Final lean | `it_tech_db-final-lean-post-cleanup-2026-07-13T16-02-29-692Z.json` / `941f3b5abcfd30db21f913d9741c68d32c69aa068a4a646b7c1ea60f4c37456a` | 288 tables / 84,040 rows / 1 routine / 2 triggers; disposable restore verified |
| Pre-category-route repair | `it_tech_db-pre-catalog-route-repair-2026-07-13T17-26-35-738Z.json` / `e47e523256f7eaa94156ee81007ecc8b75d9bea0fba41779d88431cae52dab21` | 288 tables / 84,049 rows; retained clone passed route apply/rollback/re-apply, index and API checks |
| Post-category-route repair | `it_tech_db-post-catalog-route-repair-2026-07-13T17-35-18-760Z.json` / `4d7c52495957b1072627c5c9bbf7326b08fee6e595b43ace37f93f3f991472ef` | 288 tables / 84,049 rows / 1 routine / 2 triggers; disposable restore verified after live cutover |
| Pre-customer-favorites | `it_tech_db-pre-customer-favorites-2026-07-14T09-41-52-044Z.json` / `c04b1515f44b0a0e4c7b4161ac08059fdda37fa84b1ea8a86cc677f63da2d852` | 288 tables / 84,049 rows / 1 routine / 2 triggers; clone passed two idempotent favorites migrations plus DDL/index/FK/EXPLAIN and functional checks |
| Pre-category-feature container color | `it_tech_db-pre-category-feature-container-color-2026-07-16T03-15-43-439Z.json` / `e7232e66509adda20ec6ebd91ab58700c2eded8b7d8f548454aab57c42f4b970` | 289 tables / 84,254 rows / 1 routine / 2 triggers; disposable restore verified before the additive color-column migration ran twice |

All files live under `D:\web-tech\tmp\db-backups` and are ignored by Git. Protect at least the latest post-category-route repair, pre-customer-favorites, final lean, and post-run-8/pre-cleanup bundles in approved encrypted storage. The logical backup tool writes a `.sha256` file and a `.manifest.json` whose restore result and database-bound hash are checked by guarded cleanup/repair commands.

The current accepted database has 292 tables. Before moving machines, generate a fresh post-migration consistent export and restore-verify it; the pre-page-view artifact above is the latest rollback boundary and intentionally lacks the two page-view tables.

## Verified local artifact

The following archive was generated outside Git and restored successfully into a disposable local MySQL database:

| Artifact | Value |
|---|---|
| SQL | `D:\web-tech\tmp\db-backups\it_tech_db-migration-20260713-175300.sql` |
| SQL size | 105,243,385 bytes |
| SQL SHA-256 | `86b1eb9113e3c0424abd8a480936aab9123784333b1fdb1740920c5c0662e9a8` |
| ZIP | `D:\web-tech\tmp\db-backups\it_tech_db-migration-20260713-175300.sql.zip` |
| ZIP size | 13,806,638 bytes |
| ZIP SHA-256 | `517ce437140bb64aa2abc183e29a52c78ad2c44540ecd478839958714a3c9f37` |

Restore verification matched 342 tables, 152,141 exact rows across all tables, 1 routine, 2 triggers, 0 events, 788 categories, 89 brands, 4,712 products, and 4,712 search rows. The disposable database was then removed.

Do not commit these artifacts: a full database archive can contain admin credentials, configuration, operational history, or personal data. Transfer it through an approved encrypted channel and remove temporary copies after acceptance.

## Phase-1 collation rollback artifact

The maintenance-window source was freshly exported before collation conversion and restored into `it_tech_db_collation_test_20260713_195854` before any live ALTER:

| Artifact | Value |
|---|---|
| SQL | `D:\web-tech\tmp\db-backups\it_tech_db-pre-collation-20260713-195854.sql` |
| SQL size / SHA-256 | 105,255,739 bytes / `cc0b1d36f07ee8262e8209e0c769cacc3bf9e62624fa24eb2d1cdcf7d7884839` |
| ZIP | `D:\web-tech\tmp\db-backups\it_tech_db-pre-collation-20260713-195854.zip` |
| ZIP size / SHA-256 | 13,806,911 bytes / `8e0b929be2517a05219bcf0eb167fb3175e98772b96d5a1baef50e150cdad489` |

The clone matched 342 tables, 152,141 rows, 1 routine, 2 triggers and critical catalog counts, then passed phase-1 apply/verify with 31 recovery tables/108 Latin-1 columns left intentionally. It was removed after live acceptance. The live apply used the independently database-bound plan hash documented in the migration guide. If rollback is required, keep services stopped, restore this archive into a disposable database and fully verify it before replacing `it_tech_db`; do not ALTER the converted database back to Latin-1.

## Pre-article-category rollback artifact

Services were stopped and a fresh MySQL 8.4 dump was created immediately before article-category run 6:

| Artifact | Value |
|---|---|
| SQL | `D:\web-tech\tmp\db-backups\it_tech_db-pre-article-categories-20260713-203630.sql` |
| SQL size / SHA-256 | 105,287,376 bytes / `63d0944ac73a19b35d2e675952f9541dda4b0def459ddaed0db430f9e25ce569` |
| ZIP | `D:\web-tech\tmp\db-backups\it_tech_db-pre-article-categories-20260713-203630.zip` |
| ZIP size / SHA-256 | 13,807,458 bytes / `f0d4e19879353edf5ca21bf1bcf75bc14cf402174b4613f809299770289cf993` |

The SQL was restored into `it_tech_db_article_category_test_20260713_203630`. The clone matched the pre-run catalog invariants and passed dry-run, guarded apply, exact category/route/registry/map/record verification, and run-ID rollback to zero article-category state. Live run 6 then applied the same source hash. Post-run live state is 346 tables, 152,162 exact rows, 1 routine, 2 triggers, 25 full-text indexes, and critical counts `788 / 89 / 4,712 / 4,712`; article-category state is `4 categories / 4 routes / 0 articles / 0 menu references`.

## Pre-article rollback artifact and clone trial

Immediately before run 7, the post-run-6 database was captured with the guarded logical backup tool and restore-verified:

| Artifact | Value |
|---|---|
| Bundle | `D:\web-tech\tmp\db-backups\it_tech_db-pre-pcmarket-articles-trial2-2026-07-13T14-35-27-969Z.json` |
| SHA-256 | `5c2dd8c9e8fcc3b5cef7e157d69e8e60c8142f481294fcde25bee35e55486847` |
| Baseline | 346 tables / 152,162 exact rows / 1 routine / 2 triggers |
| Clone | `it_tech_db_backup_test_1783953327970_b83c6b` |

The clone passed article apply, guarded rollback to zero articles/content/links/routes/maps while retaining run 6, and a second apply with the final quality checks. Live run 7 then used the same fresh canonical source hash. The bundle remains historical recovery evidence; run-7 in-database recovery tables were removed only after final acceptance and newer restore verification.

## Recommended export method

Use MySQL 8.4 command-line tools from the same or a compatible server version. The verified local binaries are under:

```text
D:\laragon\bin\mysql\mysql-8.4.3-winx64\bin
```

1. Enter a maintenance window. Stop `web-admin`, storefront write journeys, and the background worker. Confirm `ADMIN_WRITE_ENABLED=false`.
2. Confirm the source explicitly:

```powershell
& 'D:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe' -u root -p -e "SELECT SCHEMA_NAME FROM information_schema.schemata WHERE SCHEMA_NAME='it_tech_db';"
```

3. From `cmd.exe`, export while writes remain stopped. `--lock-all-tables` provides one consistent lock boundary across the mixed InnoDB/MyISAM database; do not combine it with `--single-transaction`.

```bat
"D:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe" -u root -p --default-character-set=utf8mb4 --routines --triggers --events --hex-blob --set-gtid-purged=OFF --lock-all-tables --quick it_tech_db > "D:\web-tech\tmp\db-backups\it_tech_db-migration.sql"
```

4. Record a checksum and optionally create an archive:

```powershell
Get-FileHash 'D:\web-tech\tmp\db-backups\it_tech_db-migration.sql' -Algorithm SHA256
Compress-Archive -LiteralPath 'D:\web-tech\tmp\db-backups\it_tech_db-migration.sql' -DestinationPath 'D:\web-tech\tmp\db-backups\it_tech_db-migration.sql.zip'
Get-FileHash 'D:\web-tech\tmp\db-backups\it_tech_db-migration.sql.zip' -Algorithm SHA256
```

5. Restart local services only after the export process exits successfully and the SQL file is non-empty.

Never put a password on the command line or in a committed script. Use the interactive `-p` prompt or an OS-protected MySQL option file.

## Import on the new machine

1. Install a compatible MySQL version and compare `SELECT VERSION()`. A MariaDB or older MySQL destination requires a separate compatibility test; the local success was MySQL 8.4.3 to MySQL 8.4.3.
2. Copy the ZIP through an encrypted channel, verify its SHA-256, extract it, then verify the SQL SHA-256.
3. Back up any database already named `it_tech_db`. Do not overwrite it until ownership and retention are confirmed.
4. Create a fresh target database:

```powershell
& 'C:\path\to\mysql.exe' -u root -p -e "CREATE DATABASE it_tech_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

5. Import from `cmd.exe` so the SQL stream is not re-encoded by a shell text pipeline:

```bat
"C:\path\to\mysql.exe" -u root -p --default-character-set=utf8mb4 it_tech_db < "C:\path\to\it_tech_db-migration.sql"
```

If routine creation is rejected on a binary-logged destination, grant the migration account the required routine privileges or temporarily use the DBA-approved `log_bin_trust_function_creators` procedure. Do not remove the function/triggers from the archive merely to make import succeed.

6. Create ignored application environment files on the new machine. At minimum, `web-admin/.env` must point `DATABASE_URL` to the new `it_tech_db` and start with `ADMIN_WRITE_ENABLED=false`. Do not copy secrets through Git.

## Mandatory restore verification

Run these checks before serving traffic:

```sql
SELECT COUNT(*) AS tables,
       SUM(engine='InnoDB') AS innodb,
       SUM(engine='MyISAM') AS myisam
FROM information_schema.tables
WHERE table_schema='it_tech_db';

SELECT COUNT(*) AS routines
FROM information_schema.routines
WHERE routine_schema='it_tech_db';

SELECT COUNT(*) AS triggers
FROM information_schema.triggers
WHERE trigger_schema='it_tech_db';

SELECT
  (SELECT COUNT(*) FROM it_tech_db.idv_seller_category) AS categories,
  (SELECT COUNT(*) FROM it_tech_db.idv_brand) AS brands,
  (SELECT COUNT(*) FROM it_tech_db.idv_sell_product_store) AS products,
  (SELECT COUNT(*) FROM it_tech_db.product_data_search) AS search_rows;
```

Expected for the current accepted post-favorites database: `289 / 161 / 128` total/InnoDB/MyISAM tables, 1 routine, 2 triggers, and critical counts `788 / 90 / 4712 / 4712`. Require `web_admin_customer_favorites`, compare import runs 1–8, non-null acceptance/rollback-closure/cleanup fields for runs 2–8, zero recovery/stage/restore tables, zero Latin-1/utf8mb3 columns, 4 article categories, 668 articles/content rows, 705 unique category links, 668 article routes/maps, 669 run-7 records, zero article-menu references, PCM 2,276 total/849 enabled products, admin login/RBAC/menu counts, and application readiness. Older archive sections retain their own documented pre-run expectations and may correctly have fewer tables/rows.

The paragraph above is retained as the historical post-favorites expectation. The superseding post-page-view expectation is `292 / 164 / 128` total/InnoDB/MyISAM tables with both `web_admin_page_view_events` and `web_admin_page_view_totals`, plus 6,176 canonical entity rows before retained runtime events. Current article-category count is 8.

Then run both applications' required typecheck/lint/test/build matrix and `npm.cmd run local:healthcheck`. Only switch DNS/proxy/traffic after database and application checks pass.

## phpMyAdmin fallback and the observed TypeError

The local phpMyAdmin export page failed because the 342-table form exceeded PHP's default `max_input_vars=1000`; the browser showed only `TypeError` and phpMyAdmin warned that forms with more than 1,000 fields could be truncated. On this Laragon host, active PHP 8.3.30 was changed to:

```ini
max_input_vars = 10000
```

Apache was restarted and a 1,500-variable POST test succeeded. The original `php.ini` was backed up beside the active file with suffix `.pre-max-input-vars-20260713`.

This setting is host-local and is not part of Git. On another machine, edit the `php.ini` actually loaded by Apache (`phpinfo()` or `php --ini`), raise the limit above the export form size, restart Apache, and verify the effective value. Quick export may work after that, but CLI export remains preferred because it avoids browser upload/execution/form limits and makes flags/checksums reproducible.

For phpMyAdmin import of a 105 MB SQL file, PHP upload/post/time/memory limits may also need adjustment. Importing with `mysql.exe` avoids those PHP limits.
