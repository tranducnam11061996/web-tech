# Database Quick Reference

Verified: `2026-07-09`  
Database: `hanoi23_db`

## Core Product Read Model

```text
idv_sell_product_store p
  1:1 idv_sell_product_price pr ON pr.id = p.id
  1:1 idv_sell_product_info i ON i.id = p.id
  N:M idv_seller_category c via idv_product_category pc
  N:M idv_attribute_value v via idv_product_attribute pa
  0:N idv_url u via generated id_path
  0:1 product_data_search s ON s.product_id = p.id
```

Available product rule for cart/order:

```sql
pr.isOn = 1 AND pr.price > 0
```

## Product by Slug

```sql
SELECT u.id_path, u.url_type
FROM idv_url u
WHERE u.request_path = ?
LIMIT 1;
```

Product id is parsed from `id_path` pattern:

```text
module:product/view:product-detail/view_id:{id}
```

## Category Products

```sql
SELECT DISTINCT
  p.id,
  p.storeSKU,
  p.proName,
  p.proThum,
  pr.price,
  pr.market_price
FROM idv_sell_product_store p
JOIN idv_sell_product_price pr ON pr.id = p.id
JOIN idv_product_category pc ON pc.pro_id = p.id
WHERE pc.category_id = ?
  AND pr.isOn = 1
ORDER BY p.id DESC
LIMIT ? OFFSET ?;
```

Do not join `idv_product_category` expecting category names. Names are in `idv_seller_category`.

## Attribute Count Pattern

Use aggregate once, not correlated count per value:

```sql
SELECT pa.attr_value_id, COUNT(DISTINCT pa.pro_id) AS product_count
FROM idv_product_attribute pa
JOIN idv_product_category pc
  ON pc.pro_id = pa.pro_id
 AND pc.category_id = ?
JOIN idv_sell_product_price pr
  ON pr.id = pa.pro_id
 AND pr.isOn = 1
GROUP BY pa.attr_value_id;
```

## Search Health

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

Expected at audit:

```text
product_count = 28763
search_count = 28763
missing_count = 0
```

Search infrastructure objects:

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = DATABASE()
  AND routine_name = 'webtech_normalize_product_search';
```

```sql
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = DATABASE()
  AND trigger_name LIKE 'webtech_product_search_after_%';
```

Expected triggers:

- `webtech_product_search_after_insert`
- `webtech_product_search_after_update`

## Cart Quote Query Shape

```sql
SELECT
  p.id,
  p.storeSKU,
  p.proName,
  p.proThum,
  pr.price,
  pr.market_price,
  pr.isOn,
  u.request_path AS slug
FROM idv_sell_product_store p
LEFT JOIN idv_sell_product_price pr ON pr.id = p.id
LEFT JOIN idv_url u
  ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
WHERE p.id IN (?);
```

Never accept price/status from the client as trusted input.

## Order Write Model

```text
build_buy.id -> build_buy_item.order_id
```

All order writes must be inside one transaction.

## Product Images

Legacy product detail source:

- `idv_sell_product_store.image_collection`: PHP serialized image list.
- `idv_sell_product_store.proThum`: legacy thumbnail.
- `idv_sell_product_store.image_count`: legacy count.

New metadata table planned/implemented in code:

```text
web_admin_product_images(product_id, type, relative_path, alt, ordering, is_main, ...)
```

Type mapping:

- `product`: official product image.
- `self`: HACOM self-shot image.
- `customer`: customer image.

Storefront grouping:

```text
imageGroups.product = product + self
imageGroups.customer = customer
```

Live audit did not find `web_admin_product_images`; run `admin:migrate` with writes enabled before relying on it.

## Managed Menu Tables

```text
web_admin_menus
  -> web_admin_menu_versions
  -> web_admin_menu_items
```

Runtime split:

- `/api/menu/header`: all-site header data.
- `/api/menu/homepage`: homepage-only Circle Story and Shop by Category.

Important menu item columns:

```text
area, parent_id, node_type, label, icon_key, badge_text, suffix_text,
background_color, image_url, sub_text, link_mode, entity_type, entity_id,
custom_url, url_override, ordering, is_active, desktop_visible, mobile_visible
```

## Banner Metadata

Canonical banner data remains in legacy tables:

```text
idv_seller_ad_location
idv_seller_ad
idv_seller_ad_category
```

Modern optional metadata lives in:

```text
web_admin_banner_meta(ad_id, mobile_file_url, alt_text, headline, subheading,
cta_label, background_color, text_color, render_mode, style_json, updated_at)
```

Public APIs:

- `/api/banners/homepage`
- `/api/banners/global`
- `/api/banners/location/[locationKey]`

## Product Card Attribute Badges

Rules table:

```text
web_admin_product_card_attribute_rules(
  category_id, attr_id, slot, color_variant, label_template,
  value_mode, max_values, ordering, status, inherit_to_children
)
```

Canonical values remain in:

```text
idv_attribute
idv_attribute_value
idv_attribute_category
idv_product_attribute
```

Public product/search payloads include `cardBadges`; storefront should not fetch attributes per card.

## Category First Box

Feature table:

```text
web_admin_category_feature_boxes(
  category_id, homepage_enabled, category_page_enabled, box_position,
  render_mode, background_image_url, mobile_background_image_url, target_url,
  headline, subheading, cta_label, text_color, overlay_color, button_style_json
)
```

No column is added to `idv_seller_category`.

Public access:

- `/api/products/[slug]`: category payload includes `featureBox`.
- `/api/products?category_id=...`: response includes `layoutMeta.featureBox`.
- `/api/categories/homepage-feature-sections`: homepage category sections with feature boxes and products.

## Admin Helper Tables

```text
web_admin_sequence.name = 'product'
  -> allocates new idv_sell_product_store.id values

web_admin_entity_registry(entity_type, entity_id)
  -> marks rows created by Admin API
  -> required for permanent delete
```

Current `web_admin_sequence` row:

```text
product -> next_id 90788
```

## Useful Counts

```sql
SELECT COUNT(*) FROM idv_sell_product_store;
SELECT COUNT(*) FROM product_data_search;
SELECT COUNT(*) FROM idv_sell_product_image_name;
SELECT COUNT(*) FROM idv_product_image_stock;
SELECT COUNT(*) FROM web_admin_entity_registry;
```

Audit values:

| Table | Exact count |
|---|---:|
| `idv_sell_product_store` | 28,763 |
| `product_data_search` | 28,763 |
| `idv_sell_product_image_name` | 212,184 |
| `idv_product_image_stock` | 210,998 |
| `web_admin_entity_registry` | 0 |

## Cautions

- Many legacy tables have no physical FK.
- DB mixes InnoDB and MyISAM.
- Most legacy tables use `latin1_swedish_ci`; `product_data_search` uses `utf8mb4_unicode_ci`.
- Attribute/icon/filter data can contain URL/script-like legacy values.
- Do not add indexes or migrations without measuring query plans and having backup/rollback.
