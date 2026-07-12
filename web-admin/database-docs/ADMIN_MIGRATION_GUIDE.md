# Admin and Search Migration Guide

Last verified: `2026-07-13`

Read this before any schema-changing command. The configured local database has received the latest additive admin migration; no other environment should be assumed migrated.

## Safety rules

- Identify and back up the target database before enabling writes.
- Admin migration requires `ADMIN_WRITE_ENABLED=true`; this guard must remain in place.
- Run migrations from `D:\web-tech\web-admin` with production secrets supplied outside Git.
- Do not modify legacy engines, collations, columns, or data unless a dedicated migration/rollback plan explicitly requires it.
- Prefer additive, idempotent `CREATE TABLE IF NOT EXISTS`/compatible helper-column changes.
- After migration, verify readiness, table/index definitions, application build, and core smoke flows before serving traffic.

## Configured local database state

### Combo migration

The combo migration ran twice successfully against identified local database `hanoi23_db` on `2026-07-12`. It verified that `(product_id,set_id)` had no duplicates, then added two `combo_set_product` indexes and three combo-order metadata columns with two indexes. For other environments, retain the same preflight. Roll back application code first; only then, if no combo orders depend on the metadata, drop `idx_web_admin_order_meta_combo`, `idx_web_admin_order_meta_type`, the three metadata columns, `idx_combo_set_product_set_product`, and `uq_combo_set_product_product_set`. Do not remove orphan legacy rows as part of this rollback.

### Product-group migration

The product-group migration ran twice successfully against local `hanoi23_db` on `2026-07-12`. It preflights duplicate `config_group_product.product_id` rows, then adds `uq_config_group_product_product(product_id)` to enforce one group per product and force-removes obsolete `config_group_attribute_value.image`/`color_code` columns after logging their non-empty counts. It does not add foreign keys or remove legacy orphans. Rollback after reverting application writes is `ALTER TABLE config_group_product DROP INDEX uq_config_group_product_product`; restoring removed value columns only restores empty schema, not discarded data.

Read-only verification on `2026-07-13` found 285 tables: 157 InnoDB and 128 MyISAM. The buying-guide and product-promotion migrations completed twice successfully to verify idempotency, and the following groups exist:

Product-promotion migration verification on `2026-07-13` ran twice successfully against identified local `hanoi23_db`. The three UTF-8 InnoDB tables, relation foreign keys, reverse-lookup indexes, mixed-scope resolver and delete cascade were verified; integration fixtures were removed afterward. Current totals are 285 tables: 157 InnoDB and 128 MyISAM.

- Admin sequence/entity registry, access/RBAC/audit infrastructure.
- Product images, managed menus, banner metadata, product-card rules, and category feature boxes.
- Product/category buying guides and ordered guide items.
- Voucher/category/redemption tables.
- Product-promotion program/product/category tables.
- Storefront customer registration/password/session/OTP/attempt/address/order-link/metrics tables.
- `web_admin_order_requests`, `web_admin_request_limits`, `web_admin_email_outbox`, `web_admin_cache_versions`, and `web_admin_webhook_nonces`.

The exact 28,763 product/search counts and zero missing search rows were last verified on `2026-07-07`; re-query before relying on them.

## Admin migration

The script calls the current ensure functions for admin core/access, product images, menus, banners, badges, category feature boxes, product/category buying guides, vouchers, storefront orders, customer accounts, and performance/security infrastructure.

```powershell
cd D:\web-tech\web-admin
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run admin:migrate
```

The migration also removes the obsolete `config_group_attribute_value.image` and `color_code` columns when present. It logs the number of non-empty values before its forced drop; restore columns only from a database backup if legacy value visuals are needed again.

Without the flag the expected result is:

```text
ADMIN_WRITE_ENABLED must be true to run admin migrations.
```

Disable or unset the flag after migration if the environment should not permit admin writes.

## Search migration and rebuild

`search:migrate` creates/recreates `product_data_search`, the normalize function, insert/update triggers, and search rows. It is destructive to those search infrastructure objects and should not be run as a routine deployment step.

```powershell
npm.cmd run search:migrate
```

Use rebuild when only search text needs refreshing:

```powershell
npm.cmd run search:rebuild
```

Production search runtime is in `web-admin`; `search-tool` is historical reference only.

## Post-migration verification

```sql
SELECT COUNT(*) AS total_tables,
       SUM(engine = 'InnoDB') AS innodb_tables,
       SUM(engine = 'MyISAM') AS myisam_tables
FROM information_schema.tables
WHERE table_schema = DATABASE();
```

```sql
SELECT table_name, engine
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'web_admin_product_images',
    'web_admin_menus',
    'web_admin_menu_versions',
    'web_admin_menu_items',
    'web_admin_banner_meta',
    'web_admin_product_card_attribute_rules',
    'web_admin_category_feature_boxes',
    'web_admin_buying_guides',
    'web_admin_buying_guide_items',
    'web_admin_vouchers',
    'web_admin_voucher_categories',
    'web_admin_voucher_redemptions',
    'web_admin_product_promotions',
    'web_admin_product_promotion_products',
    'web_admin_product_promotion_categories',
    'web_admin_storefront_customers',
    'web_admin_customer_sessions',
    'web_admin_order_requests',
    'web_admin_request_limits',
    'web_admin_email_outbox',
    'web_admin_cache_versions',
    'web_admin_webhook_nonces'
  )
ORDER BY table_name;
```

```sql
SHOW CREATE TABLE web_admin_order_requests;
SHOW CREATE TABLE web_admin_request_limits;
SHOW CREATE TABLE web_admin_email_outbox;
SHOW CREATE TABLE web_admin_cache_versions;
SHOW CREATE TABLE web_admin_webhook_nonces;
SHOW CREATE TABLE web_admin_buying_guides;
SHOW CREATE TABLE web_admin_buying_guide_items;
SHOW INDEX FROM web_admin_customer_sessions;
SHOW INDEX FROM web_admin_voucher_redemptions;
SHOW CREATE TABLE web_admin_product_promotions;
SHOW CREATE TABLE web_admin_product_promotion_products;
SHOW CREATE TABLE web_admin_product_promotion_categories;
```

Application verification:

```powershell
npm.cmd run test:unit
npm.cmd run test:integration
npm.cmd run build
npm.cmd run start
npm.cmd run local:healthcheck
```

Confirm `/api/health/ready` returns `200`. Then smoke product images, managed content, voucher/customer/admin flows, order idempotency, outbox processing, and cache invalidation.

Buying-guide rollback is code-first: deploy code that no longer reads/writes the helper tables, take a backup, then drop `web_admin_buying_guide_items` before `web_admin_buying_guides`. Never drop them while a deployed admin can still save this content.

Product-promotion rollback is also code-first: deploy code that no longer reads/writes `productPromotions`, back up the data, then drop `web_admin_product_promotion_products` and `web_admin_product_promotion_categories` before `web_admin_product_promotions`.

## Operational inspection and cleanup

Use aggregate/status queries and avoid exposing sensitive payloads:

```sql
SELECT status, COUNT(*) FROM web_admin_order_requests GROUP BY status;
SELECT status, COUNT(*) FROM web_admin_email_outbox GROUP BY status;
SELECT cache_key, version, updated_at FROM web_admin_cache_versions ORDER BY cache_key;
SELECT COUNT(*) AS expired_limits FROM web_admin_request_limits WHERE expires_at < UTC_TIMESTAMP();
SELECT COUNT(*) AS expired_nonces FROM web_admin_webhook_nonces WHERE expires_at < UTC_TIMESTAMP();
```

The background worker removes expired runtime rows in bounded batches and sends outbox entries with retry/backoff. Do not replace it with unbounded deletes in request handlers.

## Vietnam location catalog

The admin migration creates UTF-8 helper storage for the current two-level address model without changing legacy `province_*` data. Run the explicit sync only when refreshing the last-known-good catalog:

```powershell
npm.cmd run locations:sync
```

New addresses store province/ward codes plus name snapshots; existing legacy three-tier addresses retain their legacy schema marker. Runtime should continue serving cached DB data if the upstream provider is unavailable.

## Rollback principles

- Disable dependent UI/API behavior before removing any helper table; prefer forward-fix migrations.
- Do not drop search tables/functions/triggers without a replacement synchronization path.
- Do not delete uploaded files outside the verified `MEDIA_ROOT` path.
- Preserve legacy product image fields before disabling the helper-table reader/writer.
- Never attempt to roll back a transaction across MyISAM tables as though it were fully transactional.
