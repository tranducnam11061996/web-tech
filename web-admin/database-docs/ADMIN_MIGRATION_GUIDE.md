# Admin and Search Migration Guide

Last audited: 2026-07-07

This guide is for database-changing scripts in `web-admin`. Read it before running migrations on any shared or production-like database.

## Safety Rules

- Admin write paths are intentionally gated by `ADMIN_WRITE_ENABLED=true`.
- Search migration scripts mutate the database directly. Run them only after checking `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_NAME`.
- Take a database backup before changing production.
- Do not assume a migration already ran just because the code exists.
- Prefer running scripts from `D:\web-tech\web-admin`.

## Current Live State

Verified against the configured database on 2026-07-07:

| Object | State |
| --- | --- |
| `product_data_search` | Present, InnoDB, `utf8mb4_unicode_ci`, 28,763 rows |
| `webtech_normalize_product_search` | Present |
| `webtech_product_search_after_insert` | Present |
| `webtech_product_search_after_update` | Present |
| `fk_product_data_search_product` | Present |
| `web_admin_sequence` | Present, row `product -> 90788` |
| `web_admin_entity_registry` | Present, empty |
| `web_admin_product_images` | Not present in live DB at audit time; implemented in code and created by admin migration when writes are enabled |

## Environment

Required `.env.local` keys:

```env
DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=web_tech
```

For admin write migrations and write APIs:

```env
ADMIN_WRITE_ENABLED=true
ADMIN_DRY_RUN=false
```

For uploaded product images:

```env
MEDIA_ROOT=D:\web-tech\media
MEDIA_BASE_URL=/api/media
```

## Admin Migration

Purpose:

- Create helper tables used by admin write flows.
- Seed `web_admin_sequence`.
- Create the new product image album metadata table.

Command:

```powershell
cd D:\web-tech\web-admin
$env:ADMIN_WRITE_ENABLED='true'
$env:ADMIN_DRY_RUN='false'
npm.cmd run admin:migrate
```

Expected current behavior without the write flag:

```text
ADMIN_WRITE_ENABLED must be true to run admin migrations.
```

That failure is intentional and means the safety gate is working.

## Search Migration

Purpose:

- Create `product_data_search`.
- Recreate the normalize function.
- Recreate insert/update triggers on `idv_sell_product_store`.
- Rebuild search text for all products.

Command:

```powershell
cd D:\web-tech\web-admin
npm.cmd run search:migrate
```

The search migration is already reflected in the audited database. Re-running it should be done only when you deliberately want to recreate the search infrastructure.

## Search Rebuild Only

Purpose:

- Refresh `product_data_search.data_search` from current product data without recreating triggers/function.

Command:

```powershell
cd D:\web-tech\web-admin
npm.cmd run search:rebuild
```

## Verification Queries

Check search table health:

```sql
SELECT COUNT(*) AS product_count FROM idv_sell_product_store;
SELECT COUNT(*) AS search_count FROM product_data_search;

SELECT COUNT(*) AS missing_count
FROM idv_sell_product_store p
LEFT JOIN product_data_search s ON s.product_id = p.id
WHERE s.product_id IS NULL;
```

Expected audited values:

| Query | Value |
| --- | --- |
| `product_count` | 28,763 |
| `search_count` | 28,763 |
| `missing_count` | 0 |

Check search infrastructure:

```sql
SHOW TRIGGERS LIKE 'idv_sell_product_store';
SHOW FUNCTION STATUS WHERE Db = DATABASE() AND Name = 'webtech_normalize_product_search';
SHOW CREATE TABLE product_data_search;
```

Check admin image table after admin migration:

```sql
SHOW CREATE TABLE web_admin_product_images;
SHOW INDEX FROM web_admin_product_images;
```

## Product Image Migration Status

The code now supports album-based product images:

- `product`: product images.
- `self`: Hacom/self-shot images.
- `customer`: customer images.

The intended new table is `web_admin_product_images`. At the 2026-07-07 audit, this table was not yet present in the live database because admin migrations had not been run with writes enabled.

Legacy image fields remain important:

- `idv_sell_product_store.proThum`
- `idv_sell_product_store.image_collection`
- `idv_sell_product_store.image_count`

After admin image writes, the code syncs metadata back to those legacy fields so existing list pages and APIs keep working.

## Rollback Notes

- Do not drop `product_data_search` without also changing `/api/search` and webhook/rebuild paths.
- Do not remove search triggers unless a replacement sync path is ready.
- Do not delete uploaded files outside `MEDIA_ROOT`.
- If product image migration needs rollback, keep legacy fields populated before disabling the new table/code path.
