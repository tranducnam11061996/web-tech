# PC Builder migrations

## v6 product prices — applied 2026-07-20

Revision `pc-builder-v6-product-prices` creates only `web_admin_pc_builder_product_prices`. It has a product primary key but no FK to the legacy catalog and does not rewrite catalog prices, component configuration, builds, items or order history.

- Backup: `D:\web-tech\tmp\db-backups\it_tech_db-pre-pc-builder-v6-2026-07-19T22-00-14-364Z.json`
- SHA-256: `afa5614534d2c13f799615dd3ac83d76bf5a169d4ec57eff09ea83e3d6d0041b`
- Restore verification: 308 tables, 95,634 rows, one routine and two triggers.
- Rehearsal clone: `it_tech_db_backup_test_1784498414364_e3491c`; `apply → apply → verify` passed.
- Live: `apply → verify` passed with one InnoDB/`utf8mb4_unicode_ci` table, five columns, one primary-key index, no FK and no orphans.

```powershell
npm.cmd run pc-builder:v6:migrate -- --mode=apply --database=<it_tech_db-or-verified-clone> --backup-sha256=<sha256>
npm.cmd run pc-builder:v6:migrate -- --mode=verify --database=<it_tech_db-or-verified-clone> --backup-sha256=<sha256>
```

Apply requires `ADMIN_WRITE_ENABLED=true`, the matching restore-verified SHA and the existing PC Builder confirmation-token pair. DDL auto-commits. Rollback is to stop PC Builder/product writes and restore the verified pre-v6 bundle into a disposable database before any approved replacement; do not drop the table casually after prices have been configured.

## v5 promotions — applied 2026-07-20

Revision `pc-builder-v5-promotions` creates only `web_admin_pc_builder_promotions`, `web_admin_pc_builder_promotion_targets` and `web_admin_pc_builder_promotion_requirements`. It does not rewrite component, build, item or order history.

- Backup: `D:\web-tech\tmp\db-backups\it_tech_db-pre-pc-builder-v5-2026-07-19T18-04-55-044Z.json`
- SHA-256: `1f9843198e868117bf720dfe17bd836399d9e33a48abb97ee06563a69789c671`
- Restore verification: 305 tables, 95,634 rows, one routine and two triggers.
- Rehearsal clone: `it_tech_db_backup_test_1784484295044_dba77f`; `apply → apply → verify` passed.
- Live: `apply → verify` passed with three InnoDB/`utf8mb4_unicode_ci` tables, three FKs and four distinct indexes.

Guarded command:

```powershell
npm.cmd run pc-builder:v5:migrate -- --mode=apply --database=<it_tech_db-or-verified-clone> --backup-sha256=<sha256>
npm.cmd run pc-builder:v5:migrate -- --mode=verify --database=<it_tech_db-or-verified-clone> --backup-sha256=<sha256>
```

Apply requires `ADMIN_WRITE_ENABLED=true`, an exact restore-verified SHA environment/input pair and the existing PC Builder confirmation-token pair. DDL auto-commits; rollback is disabling PC Builder writes and restoring the verified pre-v5 bundle into a disposable database before any approved database replacement.

## v4 catalog-live history

Status: `pc-builder-v4-catalog-live` was applied twice and verified on `it_tech_db` on `2026-07-19`.

## Recovery boundary and rehearsal

- Backup: `D:\web-tech\tmp\db-backups\it_tech_db-pre-pc-builder-v4-rehearsal-2026-07-19T09-15-57-655Z.json`
- SHA-256: `657d673b5e7e8b938c54d867e8c3f972b6a087255d73e8846f594872db4efb25`
- Verified inventory: 303 tables, 97,581 rows, one routine, two triggers.
- Retained clone: `it_tech_db_backup_test_1784452557655_209400`.
- Clone and live both passed `apply -> apply -> verify`; the clone retained one historical build/one PC Builder order and requoted the legacy build successfully.

## What v4 changes

- Drops `web_admin_pc_builder_product_metrics` before `web_admin_pc_builder_product_profiles`.
- Drops `web_admin_pc_builder_components.profile_component_code`.
- Adds/backfills `web_admin_pc_builds.catalog_revision` from `profile_revision`, then drops `profile_revision`.
- Disables every compatibility rule whose fact starts with `metric:`.
- Preserves components, relations, builds/items, order #21, benchmark snapshots, policies and release evidence.

## Guarded command

The connection is rebound to the exact `--database`. Apply requires `ADMIN_WRITE_ENABLED=true`, matching restore-verified SHA environment/input, and matching 32+ character confirmation token/input.

```powershell
npm.cmd run pc-builder:migrate -- --mode=apply --database=<it_tech_db-or-verified-clone> --backup-sha256=<sha256>
npm.cmd run pc-builder:migrate -- --mode=verify --database=<it_tech_db-or-verified-clone> --backup-sha256=<sha256>
```

Verification requires nine InnoDB/`utf8mb4_unicode_ci` PC Builder tables, no retired profile/metric tables, `category_id` without `profile_component_code`, `catalog_revision` without `profile_revision`, two relation FKs, the unique category index, and zero enabled metric rules.

## Rollback

DDL auto-commits and v4 removes verification data. There is no reverse ALTER mode. Disable `PC_BUILDER_ENABLED` first, then restore the verified backup into a disposable database and compare inventory/hashes before any approved replacement of `it_tech_db`.
