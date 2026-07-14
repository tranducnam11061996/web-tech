# Database Statistics

Last verified: `2026-07-15`

- Active database: `it_tech_db`.
- Retained legacy source: `hanoi23_db`.

Use this file for operational orientation, not as a substitute for preflight queries. `information_schema.TABLE_ROWS` is approximate for InnoDB; import/restore assertions require `COUNT(*)` or canonical hashes.

## Current physical summary

| Metric | Value | Qualification |
|---|---:|---|
| Physical tables | 289 | Lean accepted schema plus customer favorites; no recovery/stage/restore objects |
| InnoDB tables | 161 | Runtime, customer favorites, and durable audit tables |
| MyISAM tables | 128 | Legacy runtime tables |
| `latin1_swedish_ci` tables | 0 | Accepted recovery objects removed |
| `utf8mb4_unicode_ci` tables | 287 | Runtime/default collation, including customer favorites |
| `utf8mb4_0900_ai_ci` tables | 2 | Preserved MySQL-default objects |
| Stored routines | 1 | Search normalization function |
| Triggers | 2 | Product-search insert/update triggers |

After live run 8, accepted cleanup of exactly 74 recovery tables, and the additive customer-favorites migration, the active database has 289 physical tables: 161 InnoDB and 128 MyISAM. There are zero Latin-1/utf8mb3 columns and no import recovery/stage/restore tables.

The empty pre-import `it_tech_db` baseline had 285 tables: 157 InnoDB and 128 MyISAM. The current three additional InnoDB tables are the durable importer run/record/entity-map audit contract.

## Current exact catalog counts

| Table/data set | Exact rows/state |
|---|---:|
| `idv_seller_category` | 788 |
| Category roots / enabled / disabled | 60 / 722 / 66 |
| `idv_brand` | 90 |
| `idv_brand_info` (`sellerId=0`) | 90 |
| `idv_sell_product_store` | 4,712 |
| `idv_sell_product_price` | 4,712 |
| `idv_sell_product_info` | 4,712 |
| `product_data_search` | 4,712 |
| Missing product search rows | 0 |
| `idv_product_category` | 14,455 |
| `idv_product_attribute` | 17,603 |
| `idv_attribute_category` | 162 |
| `idv_brand_category` | 1,587 |
| PCM products / enabled PCM products | 2,276 / 849 |
| Product references to brand 0/34/57 | 0 |
| `web_admin_product_images` | 0 |
| `idv_seller_news_category` | 4 |
| `idv_seller_news` / `idv_seller_news_content` | 668 / 668 |
| Enabled / disabled articles | 654 / 14 |
| Article thumbnails / no-category / multi-category | 653 / 14 / 50 |
| `idv_article_category` unique links | 705 |
| Article/category canonical routes | 668 / 4 |
| Article-category menu references | 0 |
| Article/category entity registry rows | 668 / 4 |
| `web_admin_sequence` | 0 |
| `web_admin_customer_favorites` | 0 at migration acceptance; may grow through real customer use |

Imported product/category/brand images remain in their legacy fields as validated absolute `https://pcmarket.vn/...` URLs. The legacy image-name/stock/folder-counter tables and modern product-image metadata table remain empty in `it_tech_db`.

## Import/audit state

- Run 1: safe configuration, applied, 5,170 rows.
- Run 2: categories, applied, 788 source records.
- Run 3: products plus source brands/attributes/values, applied, 4,712 products.
- Run 4: first brand sync, rolled back; durable audit remains, recovery tables removed after acceptance.
- Run 5: corrected alias sync, applied historically; superseded by final brand run 8.
- Run 6: article categories, applied; 4 source records, canonical routes, registry/map/record rows, and no article/menu writes.
- Run 7: articles, applied; 669 source records, 668 runtime articles/content/routes/maps, 705 unique category links, and source ID 83 pending quarantine.
- Run 8: PCM fallback brand finalization, applied and accepted; 90 runtime brands, map `0 -> 96`, and zero noncanonical brand references.
- Runs 2-8: `accepted_at`, `rollback_closed_at`, `recovery_cleaned_at`, and cleanup report are populated; recovery tables are removed and rollback is closed.
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
