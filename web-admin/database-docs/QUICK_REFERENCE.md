# Quick Reference - E-commerce Database

## Core Business Tables

### 1. Products (`idv_sell_product_*`)
- `idv_sell_product_store` - Main product catalog (49 columns)
- `idv_sell_product_info` - Detailed product info
- `idv_sell_product_info_en` - English version
- `idv_sell_product_price` - Pricing data
- `idv_sell_product_review` - Customer reviews
- `idv_product_category` - Category hierarchy
- `idv_product_attribute` - Product attributes/specs

### 2. Customers (`idv_customer_*`)
- `idv_customer` - Main customer table
- `idv_customer_address` - Shipping addresses
- `idv_customer_group` - Customer segmentation
- `idv_customer_point` - Loyalty points
- `idv_user_comment` - User comments
- `idv_user_review` - User reviews

### 3. Orders (`build_buy`, `idv_order_request`)
- `build_buy` - Shopping cart & orders (main)
- `build_buy_item` - Order line items
- `idv_seller_order` - Seller perspective orders
- `idv_seller_order_detail` - Order details for sellers
- `idv_order_request` - Order request tracking

### 4. Sellers/Marketplace (`idv_seller_*`)
- `idv_seller` - Seller accounts
- `idv_seller_info` - Seller profiles
- `idv_seller_category` - Seller categories
- `idv_seller_admin` - Seller admin users
- `idv_seller_order` - Seller orders
- `idv_seller_product` - Seller products
- `idv_seller_review` - Seller reviews

### 5. ERP & Inventory (`erp_*`)
- `erp_product_store` - ERP product-store sync
- `erp_product_price` - Centralized pricing
- `erp_product_per_store` - Per-store inventory
- `erp_product_final` - Final product data
- `erp_retail_price` - Retail pricing

### 6. Categories & Attributes
- `idv_product_category` - Product categories
- `idv_category_special` - Special categories
- `idv_attribute` - Product attributes
- `idv_attribute_category` - Attribute categories
- `idv_attribute_value` - Attribute values

### 7. Content & SEO
- `idv_article_category` - Blog/article categories
- `idv_page_cache` - Cached pages
- `idv_search_fulltext` - Full-text search
- `idv_url` - URL management
- `idv_template` - Template system

### 8. Media & Files
- `idv_gallery` - Image galleries
- `idv_gallery_album` - Gallery albums
- `idv_movie` - Video content
- `idv_user_upload` - User uploads
- `idv_content_image` - Content images

### 9. Promotions & Deals
- `idv_promotion` - Promotions
- `idv_coupon` - Coupon codes
- `idv_coupon_use` - Coupon usage tracking
- `idv_product_deal` - Product deals
- `idv_combo_deal` - Combo deals

### 10. Logistics & Shipping
- `shipping_company` - Shipping carriers
- `shipping_setting` - Shipping config
- `idv_province_district` - Provinces/districts
- `idv_seller_shipping_method` - Seller shipping methods

### 11. Payments
- `idv_payinstall_*` - Installment payment
- `idv_seller_payment` - Seller payments
- `idv_customer_point` - Payment via points

### 12. Analytics & Reports
- `idv_visit_*` - Visit tracking (9 tables)
- `idv_report_*` - Reports (customer, order, error)
- `idv_search_track` - Search tracking
- `idv_seller_news` - Seller news/blog

---

## Important Relationships

### Product Flow
```
idv_sell_product_store (main catalog)
    ↓ references
idv_sell_product_info (details)
idv_sell_product_price (pricing)
    ↓ linked to
idv_product_category (categories)
idv_product_attribute (specs)
idv_sell_product_review (reviews)
```

### Order Flow
```
build_buy (cart/order)
    ↓ contains
build_buy_item (products)
    ↓ creates
idv_seller_order (seller orders)
    ↓ generates
idv_seller_order_detail (order details)
```

### Customer Flow
```
idv_customer (account)
    ↓ has
idv_customer_address (addresses)
    ↓ places
build_buy (orders)
    ↓ earns
idv_customer_point (loyalty)
```

### Seller Flow
```
idv_seller (account)
    ↓ manages
idv_seller_info (profile)
    ↓ sells via
idv_seller_order (orders)
    ↓ gets
idv_seller_payment (payouts)
```

---

## Key Indexes to Know

| Table | Important Indexes | Purpose |
|-------|-------------------|---------|
| idv_sell_product_store | url_hash | Fast URL lookup |
| build_buy | customerId, status | Find customer orders |
| idv_customer | email | Login/authentication |
| idv_seller_order | sellerId, orderId | Seller order tracking |
| idv_sell_product_review | productId | Product reviews lookup |

---

## Common Queries

### Get product with category
```sql
SELECT p.*, c.name as category_name
FROM idv_sell_product_store p
JOIN idv_product_category c ON p.product_cat = c.id
WHERE p.id = ?
```

### Get customer orders
```sql
SELECT b.*, COUNT(bi.id) as item_count, SUM(bi.price * bi.quantity) as total
FROM build_buy b
LEFT JOIN build_buy_item bi ON b.id = bi.buy_id
WHERE b.customerId = ?
GROUP BY b.id
ORDER BY b.postDate DESC
```

### Get seller products
```sql
SELECT p.*
FROM idv_sell_product_store p
JOIN erp_product_store e ON p.realProId = e.product_id
WHERE e.store_id = ?  -- seller/store ID
```

### Get top selling products
```sql
SELECT p.proName, p.url, p.buy_count, p.visit
FROM idv_sell_product_store p
ORDER BY p.buy_count DESC
LIMIT 20;
```

---

## Data Types Quick Guide

| Type | Usage | Range/Size |
|------|-------|------------|
| int unsigned | IDs, counters | 0 to 4,294,967,295 |
| mediumint | Counts (views, likes) | 0 to 16,777,215 |
| smallint | Small counts | 0 to 65,535 |
| tinyint(1) | Boolean flags | 0 or 1 |
| varchar(255) | Names, titles | Up to 255 chars |
| text | Long content | Up to 65KB |
| datetime | Timestamps | '1000-01-01' to '9999-12-31' |
| int (unix timestamp) | Dates as integer | Seconds since 1970 |

---

## Important Columns Pattern

| Column Pattern | Meaning |
|----------------|---------|
| `*_id` | Foreign key reference |
| `*_count` | Numeric counter |
| `*_url` | URL string |
| `*_date` / `*_time` | Timestamp |
| `has_*` / `is_*` | Boolean flag (0/1) |
| `*_json` | JSON-encoded data |
| `*_hash` | Hash value for indexing |

---

## Scripts Location

| Script | Purpose |
|--------|---------|
| `scripts/analyze-database.ps1` | Full database schema analysis |
| (output) `database-docs/DATABASE_SCHEMA.md` | Generated documentation |

---

## Migration Checklist

When moving to new machine:

- [ ] Copy all source files
- [ ] Install Laragon (or XAMPP/WAMP)
- [ ] Import MySQL database
- [ ] Update `.env` DB credentials if needed
- [ ] Start MySQL service
- [ ] Run `scripts\analyze-database.ps1`
- [ ] Verify `DATABASE_SCHEMA.md` generated
- [ ] Test DB connections in application

---

**Total Tables:** 243
**Last Analyzed:** See DATABASE_SCHEMA.md
**Database Engine:** MySQL 8.x (InnoDB)
