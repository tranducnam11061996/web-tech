# Database Statistics

Last verified: `2026-07-13`

- Active database: `it_tech_db`.
- Retained legacy source: `hanoi23_db`.

Use this file for operational orientation, not as a substitute for preflight queries. `information_schema.TABLE_ROWS` is approximate for InnoDB; import/restore assertions require `COUNT(*)` or canonical hashes.

## Current physical summary

| Metric | Value | Qualification |
|---|---:|---|
| Physical tables | 342 | Includes retained importer backup/staging objects |
| InnoDB tables | 207 | Includes InnoDB run backups |
| MyISAM tables | 135 | Includes MyISAM run backups |
| `latin1_swedish_ci` tables | 271 | Legacy plus legacy-shaped backups |
| `utf8mb4_unicode_ci` tables | 68 | Modern helper/import tables and canonical brand tables |
| `utf8mb4_0900_ai_ci` tables | 3 | Current MySQL-default objects |
| Stored routines | 1 | Search normalization function |
| Triggers | 2 | Product-search insert/update triggers |

The empty pre-import `it_tech_db` baseline had 285 tables: 157 InnoDB and 128 MyISAM. The 57 additional tables are exactly 3 import audit/map tables and 54 `web_admin_import_b_<run-id>_*` recovery tables. Do not delete them or advertise all 342 tables as stable application contracts.

## Current exact catalog counts

| Table/data set | Exact rows/state |
|---|---:|
| `idv_seller_category` | 788 |
| Category roots / enabled / disabled | 60 / 722 / 66 |
| `idv_brand` | 89 |
| `idv_brand_info` (`sellerId=0`) | 89 |
| `idv_sell_product_store` | 4,712 |
| `idv_sell_product_price` | 4,712 |
| `idv_sell_product_info` | 4,712 |
| `product_data_search` | 4,712 |
| Missing product search rows | 0 |
| `idv_product_category` | 14,455 |
| `idv_product_attribute` | 17,603 |
| `idv_attribute_category` | 162 |
| `idv_brand_category` | 1,209 |
| `web_admin_product_images` | 0 |
| `web_admin_entity_registry` | 0 |
| `web_admin_sequence` | 0 |

Imported product/category/brand images remain in their legacy fields as validated absolute `https://pcmarket.vn/...` URLs. The legacy image-name/stock/folder-counter tables and modern product-image metadata table remain empty in `it_tech_db`.

## Import/audit state

- Run 1: safe configuration, applied, 5,170 rows.
- Run 2: categories, applied, 788 source records.
- Run 3: products plus source brands/attributes/values, applied, 4,712 products.
- Run 4: first brand sync, rolled back and retained for audit/recovery.
- Run 5: corrected brand sync, applied; 91 source records canonicalized to 89 runtime brands.
- Pending audit-only relations: 11,735 variant references, 3 config occurrences, and 1,121 comboset occurrences.

## Historical source counts

Older documentation recorded 28,763 products/search rows, 212,184 product image names, 210,998 stock images, 48,378 folder counters, and populated product groups in `hanoi23_db`. Those values describe the legacy source before the approved clean-database cutover. They must not be used as current `it_tech_db` health assertions.

## Performance and data-quality observations

- Transactions must be designed around actual engines; MyISAM writes need explicit staging/swap or compensation.
- Category/list/search performance depends on bounded filters, correct junction indexes, cache versioning, and avoiding per-card queries.
- Search keeps one row per product, worker-local indexes, prewarm, and single-flight rebuild behavior.
- Two API workers default to 12 pool connections each; production must retain operational MySQL headroom.
- Legacy strings/HTML can contain mixed encoding or unsafe markup and must pass the existing normalization/sanitization boundary.
- Add indexes only after `EXPLAIN` and workload measurement.

## Re-check queries

```sql
SELECT COUNT(*) AS total_tables,
       SUM(engine = 'InnoDB') AS innodb_tables,
       SUM(engine = 'MyISAM') AS myisam_tables
FROM information_schema.tables
WHERE table_schema = DATABASE();
```

```sql
SELECT table_collation, COUNT(*) AS tables
FROM information_schema.tables
WHERE table_schema = DATABASE()
GROUP BY table_collation
ORDER BY tables DESC;
```

```sql
SELECT
  (SELECT COUNT(*) FROM idv_sell_product_store) AS product_count,
  (SELECT COUNT(*) FROM product_data_search) AS search_count,
  (
    SELECT COUNT(*)
    FROM idv_sell_product_store p
    LEFT JOIN product_data_search s ON s.product_id = p.id
    WHERE s.product_id IS NULL
  ) AS missing_search_count;
```

```sql
SELECT id, source, entity, status, item_count, snapshot_hash
FROM web_admin_import_runs
ORDER BY id;
```
