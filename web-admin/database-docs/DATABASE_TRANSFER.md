# Database Export, Restore, and Machine Transfer

Last verified: `2026-07-13`

This runbook transfers the complete active `it_tech_db` database to another machine. It preserves table definitions/data, mixed InnoDB/MyISAM engines, collations, the search routine, triggers, import audit, and run-scoped recovery tables. `hanoi23_db` is out of scope and must remain untouched.

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

Expected for the verified archive: `342 / 207 / 135` tables by engine, 1 routine, 2 triggers, and critical counts `788 / 89 / 4712 / 4712`. Also compare import runs 1–5, admin login/RBAC/menu counts, and application readiness.

Then run both applications' required typecheck/lint/test/build matrix and `npm.cmd run local:healthcheck`. Only switch DNS/proxy/traffic after database and application checks pass.

## phpMyAdmin fallback and the observed TypeError

The local phpMyAdmin export page failed because the 342-table form exceeded PHP's default `max_input_vars=1000`; the browser showed only `TypeError` and phpMyAdmin warned that forms with more than 1,000 fields could be truncated. On this Laragon host, active PHP 8.3.30 was changed to:

```ini
max_input_vars = 10000
```

Apache was restarted and a 1,500-variable POST test succeeded. The original `php.ini` was backed up beside the active file with suffix `.pre-max-input-vars-20260713`.

This setting is host-local and is not part of Git. On another machine, edit the `php.ini` actually loaded by Apache (`phpinfo()` or `php --ini`), raise the limit above the export form size, restart Apache, and verify the effective value. Quick export may work after that, but CLI export remains preferred because it avoids browser upload/execution/form limits and makes flags/checksums reproducible.

For phpMyAdmin import of a 105 MB SQL file, PHP upload/post/time/memory limits may also need adjustment. Importing with `mysql.exe` avoids those PHP limits.
