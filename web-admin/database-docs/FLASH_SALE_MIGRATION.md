# Flash Sale migration and rollout

The Flash Sale schema is additive and fail-closed. Runtime reads do not query the new tables unless `FLASH_SALES_ENABLED=true`; keep that flag false until the guarded migration has passed on the intended database.

Local rollout status (`2026-07-19`): a fresh logical backup was restore-verified with SHA-256 `72063f78d1562e078ff71822f3006c80ee3155dba2afecf4c1cc3a0f03d04223`; guarded apply passed twice on `it_tech_db`, verify passed, and the runtime flag was enabled. The four tables initially contain zero business rows.

## Objects

The migration creates four `utf8mb4_unicode_ci` InnoDB tables:

- `web_admin_flash_sale_campaigns`
- `web_admin_flash_sale_items`
- `web_admin_flash_sale_allocations`
- `web_admin_flash_sale_buyer_usage`

It does not change a legacy table, physical inventory, collation, engine, product price, or order contract. Promotional quota is owned by `web_admin_flash_sale_items`; `idv_sell_product_price.quantity=-1` is not treated as warehouse stock.

## Guarded rehearsal and apply

1. Produce a logical backup and restore it to a database named `it_tech_db_flash_sale_clone_<YYYYMMDDHHMMSS>` by following `DATABASE_TRANSFER.md`.
2. Verify the restored catalog and retain the backup SHA-256.
3. Generate one random confirmation token of at least 32 characters and set the migration-only variables in the current PowerShell process.
4. Apply twice on the clone, then run verify. The second apply proves DDL idempotency.
5. Repeat the same sequence for `it_tech_db` only in an approved maintenance window.

```powershell
$env:ADMIN_WRITE_ENABLED='true'
$env:FLASH_SALE_RESTORE_VERIFIED_SHA256='<64-hex-backup-sha256>'
$env:FLASH_SALE_MIGRATION_CONFIRMATION_TOKEN='<random-token-at-least-32-chars>'
$env:FLASH_SALE_MIGRATION_CONFIRMATION_INPUT=$env:FLASH_SALE_MIGRATION_CONFIRMATION_TOKEN

npm.cmd run flash-sale:migrate -- --mode=apply --database=it_tech_db_flash_sale_clone_YYYYMMDDHHMMSS --backup-sha256=$env:FLASH_SALE_RESTORE_VERIFIED_SHA256
npm.cmd run flash-sale:migrate -- --mode=verify --database=it_tech_db_flash_sale_clone_YYYYMMDDHHMMSS

$env:ADMIN_WRITE_ENABLED='false'
Remove-Item Env:FLASH_SALE_MIGRATION_CONFIRMATION_INPUT
```

The script verifies table engines/collation, four foreign keys, quota columns, hot-path indexes, and the system-role permission contract. It refuses unidentified database names, apply without the admin write gate, mismatched backup hashes, and mismatched confirmation tokens.

## Rollout and rollback

After migration verification, set a strong `FLASH_SALE_BUYER_HASH_SECRET`, set `FLASH_SALES_ENABLED=true`, restart both applications, and first publish a short low-quota campaign. Run quote/order/cancel/complete checks and confirm `quota_total >= quota_reserved + quota_sold` for every item.

The safe application rollback is to set `FLASH_SALES_ENABLED=false` and restart. Existing allocations remain recoverable and auditable. Do not drop tables as an operational rollback. Physical removal is a separate destructive change and is allowed only after the feature is disabled, all allocations are reconciled, an approved backup is restore-verified, and the tables are dropped in child-to-parent order.

## Verification queries

```sql
SELECT id,campaign_id,product_id,quota_total,quota_reserved,quota_sold
FROM web_admin_flash_sale_items
WHERE quota_reserved + quota_sold > quota_total;

SELECT item_id,
  SUM(status='reserved') reserved_rows,
  SUM(status='consumed') consumed_rows,
  SUM(status='released') released_rows
FROM web_admin_flash_sale_allocations
GROUP BY item_id;
```
