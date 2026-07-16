# Database Runtime Schema Reference

Verified: `2026-07-16`
Active local database: `it_tech_db`. Retained legacy source: `hanoi23_db` (read only during the 2026-07-13 cutover).
Source: live `information_schema` inspection

## Combo commerce additions

Migration verification on `2026-07-12`: applied twice successfully to local `hanoi23_db` to confirm idempotency.

Active `it_tech_db` contains the combo schema but currently has 0 `combo_set` and 0 `combo_set_product` rows. Imported PCMarket comboset occurrences remain pending audit data and were not written to these runtime tables.

- Legacy `combo_set.config` remains PHP-serialized with discount types `number|percent`; application code normalizes `number` to `fixed` and writes legacy values back unchanged.
- `combo_set_product` migration adds unique index `uq_combo_set_product_product_set(product_id,set_id)` and read/delete index `idx_combo_set_product_set_product(set_id,product_id)` after a duplicate preflight. It does not remove orphan rows.
- `web_admin_storefront_order_meta` gains `order_type enum('standard','combo')`, `combo_set_id`, `combo_anchor_product_id`, plus `(order_type,order_id)` and `(combo_set_id,order_id)` indexes. Existing rows default to `standard`.

## Physical Summary

| Metric | Value |
|---|---:|
| Total physical tables | 292 |
| InnoDB tables | 164 |
| MyISAM tables | 128 |

After accepted cleanup of runs 2-8, article-category metadata and page-view migrations, the active database has zero Latin-1 tables/columns and zero import recovery/stage/restore objects. Two existing tables retain `utf8mb4_0900_ai_ci`; other character tables use `utf8mb4_unicode_ci`. The 292-table total is the current lean application/audit schema.

Most legacy relations are logical, not physical. Do not assume FK/cascade exists unless explicitly documented below.

## Latest Migration Note

The dedicated collation migration applied live plan `15f0f236257b0214617d6b3f0ec8b04d02aad19989d91f04f8044665fc5782e6`: 187 runtime tables were rebuilt with `CONVERT TO CHARACTER SET`, 53 changed only their default, and 54 verified banner-location strings were repaired. Engines, row counts, primary/unique/full-text index structures, routine, and triggers were preserved. The remaining Latin-1 recovery objects were later removed by accepted run cleanup.

The `2026-07-14` catalog-route repair changed only `idv_url.url_type` for the 788 exact category routes, from `0` to `product:category`, and added `idv_seller_category.idx_webtech_category_parent_status(parentId,status,id)`. Category route hashes, paths, IDs, engines and row counts were unchanged. Immediately after that repair the schema had 288 tables and 84,049 rows, 1 routine and 2 triggers; the later favorites migration raised that historical state to 289 before subsequent additive migrations.

PCMarket article-category run `6` inserted source IDs `1–4`. Article run `7` then inserted 668 article/content rows, 705 unique MyISAM category links, 668 canonical routes/registry/maps and 669 records. It quarantined source ID 83, retained remote HTTPS media, and corrected the four category `request_path_index` hashes. Brand run `8` added managed PCM ID 96 and removed every runtime brand 0 reference. Recovery for runs 2-8 is now external-backup-only.

The additive admin migration was applied to the configured local database on `2026-07-11`. It intentionally avoids changing legacy catalog/content contracts and stores new runtime/admin state in helper tables including:

- `web_admin_menus`
- `web_admin_menu_versions`
- `web_admin_menu_items`
- `web_admin_banner_meta`
- `web_admin_product_card_attribute_rules`
- `web_admin_category_feature_boxes`
- `web_admin_article_category_meta`
- `web_admin_vouchers`, `web_admin_voucher_categories`, `web_admin_voucher_redemptions`
- `web_admin_product_promotions`, `web_admin_product_promotion_products`, `web_admin_product_promotion_categories`
- Storefront customer password/session/OTP/address/order-link/metrics tables
- `web_admin_customer_favorites`
- `web_admin_order_requests`
- `web_admin_request_limits`
- `web_admin_email_outbox`
- `web_admin_cache_versions`
- `web_admin_webhook_nonces`
- `web_admin_page_view_events`
- `web_admin_page_view_totals`

The page-view tables were added on `2026-07-16`. `web_admin_page_view_events.event_uuid BINARY(16)` is unique and `(processed_at,id)` is the worker index. `web_admin_page_view_totals` has primary key `(entity_type,entity_id)` and `view_count BIGINT UNSIGNED`. The four entity types are `product`, `product_category`, `article`, and `article_category`; no polymorphic FK is declared. Migration backfilled 4,712/788/668/8 rows from the corresponding legacy `visit` columns and does not mirror future totals back into those columns.

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

Exact active `it_tech_db` count verified on `2026-07-13`: `4,712` products imported by PCMarket run 3.

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

## Product Group Tables

- `config_group`: group name/description plus Unix audit fields.
- `config_group_attribute`: ordered group-owned attribute headings.
- `config_group_attribute_value`: ordered values with name, description, ordering, and audit fields. The legacy `image` and `color_code` columns were removed by the idempotent admin migration on `2026-07-12`.
- `config_group_product`: product-to-group relation; `attribute_config` is a PHP-serialized map of attribute id to value id.

The application treats these as logical relations and validates ownership transactionally. Public reads ignore placeholder `--Lựa chọn--`, malformed serialization, missing attributes/values, orphan products, inactive/zero-price products, and missing slugs. `uq_config_group_product_product(product_id)` enforces one group per product; existing `group_id` supports bounded group-member reads. No FK was added because legacy orphan rows remain intentionally untouched.

Active `it_tech_db` has 0 groups, attributes, values, and product-group relations because this catalog was not included in the approved PCMarket import. The historical `hanoi23_db` audit on `2026-07-12` found 1,972 groups, 1,813 attributes, 8,289 values, and 7,154 product relations; do not apply those counts to the current database.

## Category and Attribute Tables

### Category

- `idv_seller_category`: category metadata and hierarchy.
- `idv_product_category`: product-category junction.
- `idx_webtech_category_parent_status(parentId,status,id)`: covering lookup for enabled recursive descendant expansion.

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

Admin attribute CRUD uses these legacy tables without a migration. Attribute and value IDs are auto-incremented; `value_count` is recomputed from `idv_attribute_value` after every save. Local attributes (`scope=0`) use `idv_attribute_category`, while Global attributes (`scope=1`) are resolved by readers without materializing a row for every category. `idv_attribute_value` has no status column, so the admin editor treats every retained value as active. Permanent deletion explicitly removes product/category/SEO/card-rule relations in the owning transaction because these logical relations do not provide a complete FK cascade.

`idv_attribute_value.api_key varchar(200)` is indexed and is the canonical public URL slug for a value. As of `2026-07-15`, all 426 rows in `it_tech_db` are populated with 426 distinct `(attributeId,LOWER(api_key))` pairs and zero blanks. Application writes require the lowercase pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$` and enforce uniqueness inside each attribute while holding the attribute transaction lock; no unique index or legacy-table migration was added.

Public category filters share a read-time resolver between metadata and product queries. For a Local attribute without an active category mapping, only values with a real `idv_product_attribute` assignment to a sellable product in the enabled category/descendant scope are eligible. No fallback relation is persisted and no schema migration is required.

## News Tables

- `idv_seller_news`: InnoDB article metadata. Run 7 contains 668 rows with source IDs preserved; 654 are enabled and 14 disabled. `url` stores the exact PCMarket pathname, `request_path` adds the leading slash, `external_url` keeps the source URL, and `thumnail` keeps an absolute HTTPS PCMarket URL for 653 rows. `AUTO_INCREMENT` remains at least 2912.
- `idv_seller_news_content`: InnoDB detail HTML keyed by article ID; 668 rows. Content was sanitized during import and the storefront sanitizes it again before rendering.
- `idv_article_category`: MyISAM logical junction; 705 unique `(article_id,category_id)` rows. Category totals are `620/50/5/30`; enabled-article totals are `609/47/5/30`.
- `web_admin_import_records`: run 7 has 669 article records. Source ID 83 has `target_id=NULL` and `relation_status='pending'`; the other 668 are applied.
- No article menu references were created. Fourteen articles remain intentionally uncategorized and 50 have more than one category.

Measured news indexes are `idv_seller_news.idx_webtech_news_status_created(status,createDate DESC,id DESC)`, `idv_seller_news.idx_webtech_news_url_status(url,status)`, and the two covering junction indexes `idx_webtech_news_category_article(category_id,status,article_type,article_id)` / `idx_webtech_news_article_category(article_id,status,article_type,category_id)`. Public category membership/count queries use `UNION DISTINCT`, avoiding the former `OR` join and dependent subquery.

Article-detail related news uses the same primary/junction `UNION DISTINCT` membership for only the displayed active category, excludes the current article, orders by `createDate DESC,id DESC`, and caps at six without a global fallback. No schema or index change is required for this read contract.

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

Canonical catalog contracts are `product:category` for exact category `id_path` values and `product:product-detail` for exact product-detail values. Live counts are 788 and 4,712 respectively. The remaining 672 type-0 routes are article/news routes and are intentionally unchanged by the catalog repair.

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

Product-detail voucher discovery reads the same tables and treats an empty category link set as global. A linked category includes all descendants, matching checkout quote behavior; public payloads do not expose exact remaining quantity or redemption history.

For limited vouchers, `remaining_quantity` is decremented only while creating the order and is incremented only when a pending order becomes failed or cancelled.

## Product Promotions

The additive admin migration defines three UTF-8 InnoDB tables for display-only product-detail promotions:

- `web_admin_product_promotions`: display text, safe detail URL, active flag, manual order, optional UTC start/end, and timestamps. Indexes cover active ordering and schedule filtering.
- `web_admin_product_promotion_products`: direct product scope, primary key `(promotion_id, product_id)` and reverse lookup `(product_id, promotion_id)`.
- `web_admin_product_promotion_categories`: selected category roots, primary key `(promotion_id, category_id)` and reverse lookup `(category_id, promotion_id)`.

Both relation tables reference the helper promotion table with `ON DELETE CASCADE`; product and category IDs remain logical references to legacy tables. Category matching walks current ancestors at read time, so descendants are included without materializing product rows.

## Storefront Customer Accounts

Legacy `idv_customer*` tables remain read-only references. Modern storefront authentication is stored in InnoDB helper tables:

- `web_admin_storefront_customers`: profile, normalized unique email/phone, verification and status.
- `web_admin_customer_registration_challenges`: short-lived, hashed registration payload and OTP; a customer is inserted only after this challenge is verified.
- `web_admin_customer_passwords`, `web_admin_customer_sessions`, `web_admin_customer_auth_codes`, `web_admin_customer_auth_attempts`: Argon2id credentials with legacy bcrypt read/upgrade support, hashed session tokens, email OTP and login throttling.
- `web_admin_customer_addresses`: multiple customer-owned delivery addresses; default-address changes are transactional.
- `web_admin_customer_oauth_identities`: reserved for future Google/Facebook/Zalo/GitHub identity links.
- `web_admin_storefront_order_customer`: links new signed-in storefront orders to a customer without changing `build_buy`.
- `web_admin_storefront_customer_metrics`: transactional read model for CRM list performance (order counts, completed spend, pending orders, and latest order); it is refreshed whenever a linked order is created or changes status.
- `web_admin_customer_favorites`: one row per saved storefront customer/product pair. `customer_id bigint unsigned` has an InnoDB FK to `web_admin_storefront_customers.id` with `ON DELETE CASCADE`; `product_id int unsigned` remains a logical reference to the legacy catalog. `id bigint unsigned` provides newest-first cursor pagination, unique `(customer_id,product_id)` prevents duplicates, `(customer_id,id)` serves lists, and `(product_id,customer_id)` serves permanent-product cleanup. Names, prices, images, and visibility are never snapshotted; reads join current public catalog rows.

The favorites migration was applied on `2026-07-14` after restore-verifying `it_tech_db-pre-customer-favorites-2026-07-14T09-41-52-044Z.json` (SHA-256 `c04b1515f44b0a0e4c7b4161ac08059fdda37fa84b1ea8a86cc677f63da2d852`). The retained clone produced stable DDL SHA-256 `7cb8100fdec1f9bb2e4ac122fd9306a4a332d29b730935022a51326d75a722d7` across two migration runs and passed FK/index/EXPLAIN plus dedupe, customer isolation, cursor and cascade checks before removal. The live table initially contains 0 rows.

Location names are read from `province_list`, `province_district_list`, and `province_ward_list`; the customer tables store only their ids.

## Search Infrastructure

### `product_data_search`

Exists in live DB.

| Column | Type | Key | Meaning |
|---|---|---|---|
| `product_id` | `int unsigned` | PK | Product id |
| `data_search` | `text` | - | Normalized product search text |

Exact active count verified on `2026-07-13`: `4,712`, matching `idv_sell_product_store` with `missing_count = 0` after PCMarket product run 3.

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
| `idv_sell_product_image_name` | 0 | Legacy product image-name table was not imported |
| `idv_product_image_stock` | 0 | Legacy stock-image library was not imported |
| `idv_customer_product_image` | 0 | Legacy customer image table, currently empty |
| `product_image_folder_counter` | 0 | Legacy folder counter was not imported |

### `web_admin_product_images`

This table exists in active `it_tech_db` and has 0 rows as of `2026-07-13`. Imported PCMarket images remain in legacy product fields as absolute HTTPS URLs; they were intentionally not expanded into this metadata table.

Columns defined by the migration:

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

Indexes defined by the migration:

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
| `container_background_color` | `varchar(16)` | Section 11 container color; default `#0f0f14` |
| `button_style_json` | `text null` | CTA button style JSON |
| `updated_at` | `timestamp` | Last update |

Indexes:

- Primary key: `category_id`.
- `idx_homepage_enabled(homepage_enabled)`.
- `idx_category_page_enabled(category_page_enabled)`.

`category_page_enabled` remains stored and is still honored by the dedicated `category` read scope, although its admin control is hidden. The storefront category banner uses the read-only `configured` scope, which returns a box enabled by either `homepage_enabled` or `category_page_enabled` without changing either value. `target_url` remains for rollback compatibility, but admin/public APIs derive `targetUrl` from `idv_seller_category.request_path`, falling back to `url`; client payloads cannot override it. `headline` accepts at most one LF newline (two rendered lines) and 255 total characters.

### `web_admin_article_category_meta`

One-to-one admin metadata for article categories. No column is added to the imported `idv_seller_news_category` contract and no physical foreign key is introduced over the legacy relation.

| Column | Type | Meaning |
|---|---|---|
| `category_id` | `int unsigned` PK | Logical reference to `idv_seller_news_category.id` |
| `is_featured` | `tinyint(1)` | Strict `0`/`1` featured state; default `0` |
| `updated_at` | `timestamp` | Last metadata update |

`admin:migrate` creates the table idempotently and backfills missing current category IDs with `0`. Admin list/detail reads left-join the helper and default a missing row to `0`; create, full edit, focused featured toggle, and permanent delete reconcile it transactionally. `PATCH /api/admin/article-categories/[id]/featured` requires `content.article_categories.update` through the standard admin write/origin/session/audit gates. The field is currently admin metadata only and does not alter storefront ordering or visibility.

## Admin Helper Tables

### Legacy import audit tables

The additive admin migration creates three UTF-8 InnoDB tables. They do not modify legacy table contracts:

- `web_admin_import_runs`: source/entity, immutable snapshot SHA-256, state, item count, preflight/report JSON, timestamps, bounded failure text, and acceptance lifecycle fields `accepted_at`, `rollback_closed_at`, `recovery_cleaned_at`, `recovery_cleanup_json`.
- `web_admin_import_records`: normalized per-source-record audit payload and `none`/`pending`/`applied` relation state. Category attribute links are `applied` after product run 3; incomplete product variants/config/combosets remain `pending`.
- `web_admin_import_entity_map`: durable source/entity/source-ID to target-ID mapping and last successful run. Product-category replacement maps source ID to the same target ID.

Apply creates run-scoped `web_admin_import_b_<run-id>_*` backup tables plus temporary staging objects. Before acceptance they are not stable schema. The guarded cleanup requires exact run IDs, all importer locks, a newer restore-verified manifest, the maintenance/write/confirmation gates, and exact generated names; it then closes rollback and records the cleanup report. Runs 2-8 have completed cleanup and no such table remains.

Current `it_tech_db` audit state: runs `1`/`2`/`3` are the applied safe-configuration, category and product imports. Brand run `4` is `rolled_back`; corrected brand run `5` remains applied in audit history and is superseded by accepted finalization run `8`. Run 2 stores 788 normalized category records; its 37 records containing 162 attribute links are now `applied`. Run 3 stores 4,712 products, 91 original brand records, 45 attributes, and 426 values as applied records. It also retains 11,735 variant references, 3 config occurrences, and 1,121 comboset occurrences as pending audit data.

Run 3 populated 4,712 rows in each legacy product store/price/info table, 14,455 `idv_product_category` rows, 17,603 `idv_product_attribute` rows, 162 `idv_attribute_category` rows, 1,218 MyISAM `idv_brand_category` rows, and 4,712 search rows. Product image fields retain absolute `https://pcmarket.vn/...` URLs; no media binary is stored in the database or workspace.

Authoritative accepted audit state: run 4 is rolled back; runs 2, 3, 5, 6, 7, and 8 are applied. Runs 2-8 all have non-null acceptance, rollback-closure, recovery-cleanup, and cleanup-report fields. The entity map keeps every product/category/article mapping plus brand source mappings `0 -> 96`, `34 -> 25`, and `57 -> 31`; external source snapshots and three verified finalization backups remain outside the database.

Brand run 8 changes the live brand state to 90 `idv_brand` rows plus exactly 90 `idv_brand_info` rows (`sellerId=0`), both `utf8mb4_unicode_ci`. `idv_brand_category` has 1,587 MyISAM rows, all product/search counts remain intact, and there are no live references to IDs 0, 34, or 57. PCM ID 96 owns 2,276 products, 849 enabled; mapping policy is `0 -> 96`, `34 -> 25`, `57 -> 31`. Thirteen source logo fields remain absolute PCMarket HTTPS URLs; PCM has no default logo/marketing content.

### Product/category buying guides

The additive admin migration defines two UTF-8 InnoDB tables for the storefront “Lý do nên mua” section. They are not seeded from the former hardcoded component content.

- `web_admin_buying_guides`: one row per `(entity_type, entity_id)`, where `entity_type` is `product` or `product_category`; stores the heading, introduction, active state, and timestamps.
- `web_admin_buying_guide_items`: ordered questions and plain-text answers, with per-item active and default-expanded flags. `guide_id` has an InnoDB FK to `web_admin_buying_guides.id` with `ON DELETE CASCADE`.

There is intentionally no physical FK from `entity_id` to legacy product/category tables. Permanent deletes remove the helper row explicitly in the owning admin transaction.

### Performance and abuse-protection tables

- `web_admin_order_requests`: unique hashed `Idempotency-Key`, payload hash, replay response and 24-hour expiry for storefront orders.
- `web_admin_request_limits`: atomic per-scope hashed request counters and temporary blocks.
- `web_admin_email_outbox`: transactional order-email queue with retry/backoff state.
- `web_admin_cache_versions`: cross-worker cache invalidation versions while each worker keeps a bounded local cache.
- `web_admin_webhook_nonces`: short-lived nonce hashes that prevent signed search-webhook replay.

Customer sessions include `idle_window_seconds`; a throttled session touch advances `idle_expires_at` but never beyond the absolute `expires_at`.

### `web_admin_sequence`

Exists in live DB.

| Column | Type | Meaning |
|---|---|---|
| `name` | `varchar(64)` PK | Sequence name |
| `next_id` | `int unsigned` | Next id to allocate |
| `updated_at` | `timestamp` | Last update |

Active `it_tech_db` currently has no sequence row. The owning admin API calls `ensureAdminTables()` transactionally and initializes `product` to `MAX(id)+1` before allocation; do not seed the historical `hanoi23_db` value `product -> 90788`.

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
