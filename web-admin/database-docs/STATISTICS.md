# Database Statistics

Verified: 2026-07-07  
Database: configured `DB_NAME` for `web-admin`  
Source: live MySQL audit plus targeted exact counts

## Physical Summary

| Metric | Value |
| --- | ---: |
| Total tables | 244 |
| InnoDB tables | 116 |
| MyISAM tables | 128 |
| `latin1_swedish_ci` tables | 243 |
| `utf8mb4_unicode_ci` tables | 1 |

The only audited `utf8mb4_unicode_ci` table is `product_data_search`. Most legacy tables remain `latin1_swedish_ci`, so connection encoding and text normalization still matter.

## Exact Counts Captured

| Table | Engine | Exact rows | Notes |
| --- | --- | ---: | --- |
| `idv_sell_product_store` | InnoDB | 28,763 | Product source of truth |
| `product_data_search` | InnoDB | 28,763 | Search cache, fully synced at audit time |
| `idv_product_image_stock` | InnoDB | 210,998 | Existing image stock/library |
| `idv_sell_product_image_name` | InnoDB | 212,184 | Existing per-product image table |
| `product_image_folder_counter` | InnoDB | 48,378 | Existing image folder counter |
| `idv_customer_product_image` | MyISAM | 0 | Legacy customer image table, currently empty |
| `web_admin_entity_registry` | InnoDB | 0 | Admin helper table |
| `web_admin_sequence` | InnoDB | 1 | `product -> 90788` |

`web_admin_product_images` was not present in the live database at audit time. The table is implemented in code and should be created by the admin migration once `ADMIN_WRITE_ENABLED=true`.

## Search Health

| Check | Value |
| --- | ---: |
| Product rows | 28,763 |
| Search rows | 28,763 |
| Products missing search row | 0 |

Search infrastructure present:

- `product_data_search`
- `webtech_normalize_product_search`
- `webtech_product_search_after_insert`
- `webtech_product_search_after_update`
- `fk_product_data_search_product`

## Performance Observations

- Category listing depends heavily on `idv_product_category`, `idv_sell_product_store`, product price data, and attribute junction tables.
- `/api/search` should prefer `product_data_search.data_search` instead of building large text expressions per request.
- The search cache table has one row per product and a primary key on `product_id`.
- New product image filtering should use `web_admin_product_images(product_id, type)` after migration.
- `build_buy_item.order_id` was previously noted as a possible future index, but current order volume is too small to justify an immediate migration without an admin order workload benchmark.

## Data Quality Observations

- Legacy content contains mixed encodings and old HTML/string fragments.
- Attribute/icon values may contain URL-like or script-like legacy values; storefront APIs sanitize before rendering filters.
- The database mixes transactional and non-transactional engines. Do not assume rollback works across every table touched by a feature.
- Legacy image paths can be stored as folder/name combinations, absolute-looking media paths, or serialized collection strings.

## Useful Re-Check Queries

```sql
SELECT engine, COUNT(*) AS tables
FROM information_schema.tables
WHERE table_schema = DATABASE()
GROUP BY engine;
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
