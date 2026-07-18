# PC Builder migration and rollout

Status: code ready; not applied to live `it_tech_db` as of 2026-07-18.

## Preconditions

1. Confirm `SELECT DATABASE(), @@version` returns exactly `it_tech_db` on the intended MySQL 8.4 target. Keep `ADMIN_WRITE_ENABLED=false` during inspection.
2. Stop storefront/admin write journeys and the background worker for the maintenance window.
3. Create a consistent full backup using `DATABASE_TRANSFER.md` with `--lock-all-tables`. Record SHA-256, restore into a separately named disposable database, then verify table/row counts and application reads.
4. Point an isolated app process at the restored clone. Set `ADMIN_WRITE_ENABLED=true` only there and run `npm.cmd run admin:migrate` twice. Both runs must succeed. Inspect engines, collations, columns, indexes and foreign keys; run typecheck, unit/integration tests and both builds.
5. Rehearse rollback on the clone. Never use or import `hanoi23_db.idv_pcbuilder_relation`.

## Live apply

During an approved window, re-confirm schema and backup SHA-256, enable `ADMIN_WRITE_ENABLED=true`, run `npm.cmd run admin:migrate`, verify the additive objects and immediately return the flag to `false`.

Run extraction as dry-run from `/product/pc-builder`. Apply requires all of:

- active schema exactly `it_tech_db`;
- `ADMIN_WRITE_ENABLED=true`;
- a 64-character SHA-256 for a restore-verified backup;
- operator input matching `PC_BUILDER_CONFIRMATION_TOKEN`.

Approve profiles in the queue. Keep `PC_BUILDER_ENABLED=false` until every required slot has current verified coverage and at least one full configuration quotes successfully. Keep `PC_BUILDER_AUTO_ENABLED=false` until each published input band produces the required diverse results.

## Rollback scope

Disable both feature flags first. Rollback may drop only the eight additive PC Builder tables (children before parents), remove the three additive order-meta columns, and restore `order_type` to `enum('standard','combo')` only after proving no `pc_builder` orders exist or exporting them. Remove only builder-specific attribute seeds identified by the migration record. Never change legacy engines, collations, catalog rows, `build_buy`, or `build_buy_item`.

MySQL DDL auto-commits, so rollback is an explicit maintenance operation, not an application transaction. Restore the verified backup if any unexpected legacy mutation is detected.
