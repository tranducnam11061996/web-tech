# Database Runtime Schema Reference

Verified: `2026-07-07`  
Database: `hanoi23_db`  
Source: live `information_schema` inspection

## Physical Summary

| Metric | Value |
|---|---:|
| Total tables | 244 |
| InnoDB tables | 116 |
| MyISAM tables | 128 |
| `latin1_swedish_ci` tables | 243 |
| `utf8mb4_unicode_ci` tables | 1 |

The only audited `utf8mb4_unicode_ci` table is `product_data_search`.

Most legacy relations are logical, not physical. Do not assume FK/cascade exists unless explicitly documented below.

## Core Product Tables

### `idv_sell_product_store`

Main catalog table.

| Column | Meaning |
|---|---|
| `id` | Product id, `int unsigned`, primary key |
| `storeSKU` | SKU |
| `proName` | Product name |
| `brandId` | Logical reference to `idv_brand.id` |
| `proThum` | Legacy thumbnail/file path used by many APIs |
| `product_cat` | Legacy CSV category field |
| `image_collection` | PHP serialized legacy image list |
| `image_count` | Legacy image count |
| `proSummary`, `specialOffer`, `promotion`, `cond` | Product content/admin fields |
| `postDate`, `lastUpdate` | Admin timestamps |

Exact count at audit: `28,763` products.

### `idv_sell_product_price`

Product price/status table. Logic is 1:1 with `idv_sell_product_store.id`.

| Column | Meaning |
|---|---|
| `id` | Product id |
| `price` | Current selling price |
| `market_price` | Market/list price |
| `isOn` | Product is sellable when `1` |
| `quantity` | Legacy quantity; checkout does not currently use it as stock authority |
| `ordering`, `lastUpdate` | Admin/listing fields |

Storefront considers a product available for cart/order when `isOn = 1` and `price > 0`.

### `idv_sell_product_info`

Product detail content, joined by `id = product id`.

Used columns include `video_code`, `spec`, `multipart_spec`, and `description`.

## Category and Attribute Tables

### Category

- `idv_seller_category`: category metadata and hierarchy.
- `idv_product_category`: product-category junction.

Common relation:

```text
idv_seller_category.id
  -> idv_product_category.category_id
  -> idv_product_category.pro_id
  -> idv_sell_product_store.id
```

Do not treat `idv_product_category` as a category metadata table.

### Attributes

- `idv_attribute`: attribute definitions.
- `idv_attribute_value`: attribute values.
- `idv_attribute_category`: category to attribute applicability.
- `idv_product_attribute`: product to attribute value junction.

Common relation:

```text
idv_attribute.id
  -> idv_attribute_value.attributeId
  -> idv_product_attribute.attr_value_id
  -> idv_product_attribute.pro_id
  -> idv_sell_product_store.id
```

Legacy attribute values/icons can contain URLs or script-like values. Public APIs must sanitize them.

## URL Routing

### `idv_url`

Slug resolver.

Product slug mapping:

```sql
u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
```

Important columns:

- `request_path`
- `request_path_index`
- `id_path`
- `target_path`
- `redirect_code`
- `url_type`

## Orders

### `build_buy`

Order header table.

Current order API writes:

- `product_title`
- `total_value`
- `product_id`
- `buyer_info` JSON
- `config` JSON
- `status`
- `create_time`
- `last_update`

### `build_buy_item`

Order line table.

Current order API writes:

- `order_id`
- `product_id`
- `title`
- `product_price`
- `quantity`

`build_buy_item.order_id` had no documented secondary index in the previous audit. Benchmark before adding an index.

## Search Infrastructure

### `product_data_search`

Exists in live DB.

| Column | Type | Key | Meaning |
|---|---|---|---|
| `product_id` | `int unsigned` | PK | Product id |
| `data_search` | `text` | - | Normalized product search text |

Exact count: `28,763`. It matches `idv_sell_product_store` count at audit, with `missing_count = 0`.

Indexes:

- Primary key on `product_id`.

Foreign key:

- `fk_product_data_search_product`
- `product_data_search.product_id -> idv_sell_product_store.id`
- `ON DELETE CASCADE`
- `ON UPDATE CASCADE`

DB routine:

- `webtech_normalize_product_search(input_text TEXT) RETURNS TEXT`

DB triggers:

- `webtech_product_search_after_insert`: after insert on `idv_sell_product_store`.
- `webtech_product_search_after_update`: after update on `idv_sell_product_store`.

Code owners:

- Migration: `web-admin/src/lib/searchInfrastructure.ts`
- Cache: `web-admin/src/lib/searchCache.ts`
- Ranking/facets: `web-admin/src/lib/productSearch.ts`
- API: `web-admin/src/app/api/search/route.ts`

## Product Image Tables

### Legacy/reference image tables

| Table | Exact count | Notes |
|---|---:|---|
| `idv_sell_product_image_name` | 212,184 | Legacy product image names; indexed by `proId` |
| `idv_product_image_stock` | 210,998 | Existing stock image library; indexed by `product_id`, `keywords` |
| `idv_customer_product_image` | 0 | Legacy customer image table, currently empty |
| `product_image_folder_counter` | 48,378 | Legacy folder counter |

### `web_admin_product_images`

The code defines this table in `web-admin/src/lib/admin/images.ts`, but the live audit did not find the table because `admin:migrate` was not run with `ADMIN_WRITE_ENABLED=true` after the image upload feature was added.

Expected columns:

- `id`
- `product_id`
- `type` (`product`, `self`, `customer`)
- `file_name`
- `folder`
- `relative_path`
- `alt`
- `ordering`
- `is_main`
- `size_bytes`
- `mime_type`
- `width`
- `height`
- `created_at`
- `updated_at`

Expected indexes:

- `(product_id, type)`
- `(product_id, ordering)`
- `(product_id, is_main)`

The image upload feature syncs this metadata back to legacy `proThum`, `image_collection`, and `image_count`.

## Admin Helper Tables

### `web_admin_sequence`

Exists in live DB.

| Column | Type | Meaning |
|---|---|---|
| `name` | `varchar(64)` PK | Sequence name |
| `next_id` | `int unsigned` | Next id to allocate |
| `updated_at` | `timestamp` | Last update |

Current row:

```text
name = product
next_id = 90788
```

### `web_admin_entity_registry`

Exists in live DB and is currently empty.

Purpose: records entities created by the new Admin API so permanent delete can be restricted to API-created rows.

Columns:

- `entity_type`
- `entity_id`
- `created_at`

Primary key: `(entity_type, entity_id)`.

## Re-check Queries

```sql
SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = DATABASE();
```

```sql
SELECT TABLE_NAME, ENGINE, TABLE_ROWS, TABLE_COLLATION
FROM information_schema.tables
WHERE table_schema = DATABASE()
ORDER BY TABLE_ROWS DESC;
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
  ) AS missing_count;
```

