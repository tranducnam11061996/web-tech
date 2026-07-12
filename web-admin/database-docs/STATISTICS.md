# Database Statistics

Last verified: `2026-07-11`

Database: configured `DATABASE_URL` for `web-admin`
Source: read-only `information_schema` query plus previously recorded exact counts

## Current physical summary

| Metric | Value | Verified |
|---|---:|---|
| Total tables | 280 | 2026-07-11 |
| InnoDB tables | 152 | 2026-07-11 |
| MyISAM tables | 128 | 2026-07-11 |

The 36-table increase from the earlier 244-table snapshot is consistent with applied additive admin/access/customer/voucher/performance infrastructure. Collation totals were not re-queried on `2026-07-11`; do not reuse the old 243/1 collation split as a current total.

## Confirmed helper tables

Read-only verification found these InnoDB tables in the configured database:

- Product/content: `web_admin_product_images`, menu tables, `web_admin_banner_meta`, product-card rules, and category feature boxes.
- Commerce: `web_admin_vouchers`, category links, redemptions, storefront order/customer links and metrics.
- Customer: customer profile, password, session, challenge/OTP/attempt, address, and related helper tables.
- Reliability/security: `web_admin_order_requests`, `web_admin_request_limits`, `web_admin_email_outbox`, `web_admin_cache_versions`, and `web_admin_webhook_nonces`.

`information_schema.TABLE_ROWS` is approximate for InnoDB and must not be used for business reporting or exact migration assertions.

## Historical exact counts

These values were last captured on `2026-07-07` and were not re-counted during the `2026-07-11` engine/table verification:

| Table | Exact rows on 2026-07-07 | Notes |
|---|---:|---|
| `idv_sell_product_store` | 28,763 | Product source of truth |
| `product_data_search` | 28,763 | Zero missing products at that audit |
| `idv_product_image_stock` | 210,998 | Legacy image stock/library |
| `idv_sell_product_image_name` | 212,184 | Legacy per-product images |
| `product_image_folder_counter` | 48,378 | Legacy folder counter |
| `idv_customer_product_image` | 0 | Legacy MyISAM customer image table |
| `web_admin_entity_registry` | 0 | Admin helper table at that time |
| `web_admin_sequence` | 1 | `product -> 90788` at that time |

Always re-query before using these as current operational facts.

## Performance observations

- The database still mixes transactional InnoDB with 128 non-transactional MyISAM tables. Verify every transaction's table engines.
- Category/list/search performance depends on junction-table indexes, bounded filters, and avoiding per-item queries.
- Search uses one row per product in `product_data_search`, worker-local in-memory indexes, prewarm, and single-flight rebuild.
- Two API workers default to 12 pool connections each. Production must reserve at least 30% of MySQL connections for operations.
- Enable slow-query logging and investigate any hot request query over 500 ms during the full load test.
- Add indexes only after `EXPLAIN` and workload benchmarks; legacy write/import costs matter.

## Data-quality observations

- Most legacy data uses old latin1-era encodings and can contain mixed-encoding HTML/string fragments.
- Attribute/icon/filter values may contain URL- or script-like legacy data and must be sanitized before public rendering.
- Legacy relationships are often logical rather than physical. Never assume FK/cascade behavior.
- Legacy image paths can be folder/name pairs, absolute-looking paths, or serialized collection strings.

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
SELECT table_name, engine
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name LIKE 'web_admin_%'
ORDER BY table_name;
```
