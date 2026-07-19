# PC Builder Catalog-live v4 migration

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
