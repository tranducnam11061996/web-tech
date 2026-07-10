# Database Runtime Schema Reference

Verified: `2026-07-09`  
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

The only audited `utf8mb4_unicode_ci` table in the live snapshot was `product_data_search`. New `web_admin_*` helper tables created by current migrations also use `utf8mb4`.

Most legacy relations are logical, not physical. Do not assume FK/cascade exists unless explicitly documented below.

## Latest Migration Note

The latest feature work intentionally avoids adding columns to legacy tables such as `idv_seller_category`, `idv_seller_ad`, or attribute tables. New runtime/admin metadata is stored in helper tables:

- `web_admin_menus`
- `web_admin_menu_versions`
- `web_admin_menu_items`
- `web_admin_banner_meta`
- `web_admin_product_card_attribute_rules`
- `web_admin_category_feature_boxes`

On older installs where menu tables were created before the latest menu fields, `admin:migrate` may add helper-table columns:

- `web_admin_menu_versions.settings_json`
- `web_admin_menu_items.background_color`
- `web_admin_menu_items.image_url`
- `web_admin_menu_items.sub_text`

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

## Storefront Vouchers

Voucher runtime data is intentionally separate from legacy MyISAM `idv_coupon` tables so quota changes can share the InnoDB order transaction.

- `web_admin_vouchers`: canonical code, active state, quota, discount rule, minimum order value, and optional UTC validity range.
- `web_admin_voucher_categories`: selected category roots; application includes descendants at quote time.
- `web_admin_voucher_redemptions`: immutable order snapshot plus `redeemed` / `released` state. `order_id` is unique to enforce one voucher per storefront order.

For limited vouchers, `remaining_quantity` is decremented only while creating the order and is incremented only when a pending order becomes failed or cancelled.

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

## Menu, Banner, Product Card, and Category Feature Tables

These tables are created or updated by:

```powershell
cd D:\web-tech\web-admin
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run admin:migrate
```

### `web_admin_menus`

Draft/publish root table for managed menus.

| Column | Type | Meaning |
|---|---|---|
| `id` | `int unsigned` auto increment | Menu id |
| `code` | `varchar(64)` | Stable menu code, unique |
| `name` | `varchar(255)` | Admin label |
| `created_at` | `timestamp` | Created time |
| `updated_at` | `timestamp` | Last update |

Indexes:

- Primary key: `id`.
- Unique key: `uk_web_admin_menus_code(code)`.

### `web_admin_menu_versions`

Stores draft, published, and archived versions for each menu.

| Column | Type | Meaning |
|---|---|---|
| `id` | `int unsigned` auto increment | Version id |
| `menu_id` | `int unsigned` | FK to `web_admin_menus.id` |
| `version_number` | `int unsigned` | Incrementing version number |
| `status` | `varchar(24)` | `draft`, `published`, or `archived` |
| `settings_json` | `text` | Version settings such as header labels |
| `created_at` | `timestamp` | Created time |
| `updated_at` | `timestamp` | Last update |
| `published_at` | `timestamp null` | Publish time |

Indexes/FK:

- Primary key: `id`.
- `idx_web_admin_menu_versions_menu_status(menu_id, status)`.
- `idx_web_admin_menu_versions_published(menu_id, published_at)`.
- FK `menu_id -> web_admin_menus.id` with cascade.

Migration note: `settings_json` may be added by `admin:migrate` if the table already exists from an older build.

### `web_admin_menu_items`

Stores tree/list items for header and homepage menu areas.

| Column | Type | Meaning |
|---|---|---|
| `id` | `int unsigned` auto increment | Item id |
| `version_id` | `int unsigned` | FK to `web_admin_menu_versions.id` |
| `area` | `varchar(32)` | Runtime area such as zones, faves, topNav, utilityLinks, circleStory, shopByCategory |
| `parent_id` | `int unsigned null` | Optional parent item |
| `node_type` | `varchar(24)` | Group/link/card style |
| `label` | `varchar(255)` | Display text |
| `icon_key` | `varchar(64)` | Icon key |
| `badge_text` | `varchar(64)` | Optional badge |
| `suffix_text` | `varchar(64)` | Optional suffix |
| `background_color` | `varchar(6)` | Optional hex color without `#` |
| `image_url` | `varchar(512)` | Optional image/media URL |
| `sub_text` | `varchar(255)` | Optional secondary text |
| `link_mode` | `varchar(24)` | `custom` or entity-driven mode |
| `entity_type` | `varchar(64)` | Optional entity type |
| `entity_id` | `int unsigned null` | Optional entity id |
| `custom_url` | `varchar(512)` | Custom target URL |
| `url_override` | `varchar(512)` | Forced target URL |
| `ordering` | `int` | Sort order |
| `is_active` | `tinyint(1)` | Active flag |
| `desktop_visible` | `tinyint(1)` | Desktop visibility |
| `mobile_visible` | `tinyint(1)` | Mobile visibility |
| `created_at` | `timestamp` | Created time |
| `updated_at` | `timestamp` | Last update |

Indexes/FK:

- Primary key: `id`.
- `idx_web_admin_menu_items_version_area(version_id, area, parent_id, ordering)`.
- `idx_web_admin_menu_items_parent(parent_id)`.
- `idx_web_admin_menu_items_entity(entity_type, entity_id)`.
- FK `version_id -> web_admin_menu_versions.id` with cascade.
- FK `parent_id -> web_admin_menu_items.id` with cascade.

Migration note: `background_color`, `image_url`, and `sub_text` may be added by `admin:migrate` if missing.

### `web_admin_banner_meta`

Optional modern display metadata for legacy banner rows in `idv_seller_ad`. No physical FK is created.

| Column | Type | Meaning |
|---|---|---|
| `ad_id` | `int unsigned` PK | Logical reference to `idv_seller_ad.id` |
| `mobile_file_url` | `varchar(512)` | Optional mobile image URL |
| `alt_text` | `varchar(255)` | Image alt text |
| `headline` | `varchar(255)` | Hybrid banner headline |
| `subheading` | `varchar(512)` | Hybrid banner subheading |
| `cta_label` | `varchar(120)` | CTA text |
| `background_color` | `varchar(16)` | Optional background color |
| `text_color` | `varchar(16)` | Optional text color |
| `render_mode` | `varchar(24)` | `image` or `hybrid` |
| `style_json` | `text null` | Extra style metadata |
| `updated_at` | `timestamp` | Last update |

### `web_admin_product_card_attribute_rules`

Rules that decide which attribute values appear as badges on product cards.

| Column | Type | Meaning |
|---|---|---|
| `id` | `int unsigned` auto increment | Rule id |
| `category_id` | `int` | Logical reference to `idv_seller_category.id` |
| `attr_id` | `int` | Logical reference to `idv_attribute.id` |
| `slot` | `varchar(32)` | `image_top_left` or `image_bottom_center` |
| `color_variant` | `varchar(24)` | Badge color variant |
| `label_template` | `varchar(120)` | Optional display template |
| `value_mode` | `varchar(24)` | `value` or `attribute_value` |
| `max_values` | `tinyint unsigned` | Max values to render |
| `ordering` | `smallint` | Sort order |
| `status` | `tinyint(1)` | Active flag |
| `inherit_to_children` | `tinyint(1)` | Apply to child categories |
| `updated_at` | `timestamp` | Last update |

Indexes:

- Primary key: `id`.
- Unique key: `uniq_category_attr_slot(category_id, attr_id, slot)`.
- `idx_category_status(category_id, status)`.
- `idx_attr(attr_id)`.

Migration seeds default laptop badge rules when matching laptop categories and attributes exist.

### `web_admin_category_feature_boxes`

Category-scoped first-box metadata for homepage category sections and the top of category pages. No column is added to `idv_seller_category`.

| Column | Type | Meaning |
|---|---|---|
| `category_id` | `int unsigned` PK | Logical reference to `idv_seller_category.id` |
| `homepage_enabled` | `tinyint(1)` | Show in homepage category section |
| `category_page_enabled` | `tinyint(1)` | Show on category page |
| `box_position` | `varchar(16)` | `left` or `right` |
| `render_mode` | `varchar(24)` | `image` or `hybrid` |
| `background_image_url` | `varchar(512)` | Desktop background image |
| `mobile_background_image_url` | `varchar(512)` | Optional mobile background image |
| `target_url` | `varchar(512)` | Link target; storefront opens new tab |
| `headline` | `varchar(255)` | Hybrid headline |
| `subheading` | `varchar(512)` | Hybrid subheading |
| `cta_label` | `varchar(120)` | Hybrid CTA label |
| `text_color` | `varchar(16)` | Text color |
| `overlay_color` | `varchar(16)` | Background/overlay color |
| `button_style_json` | `text null` | CTA button style JSON |
| `updated_at` | `timestamp` | Last update |

Indexes:

- Primary key: `category_id`.
- `idx_homepage_enabled(homepage_enabled)`.
- `idx_category_page_enabled(category_page_enabled)`.

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
