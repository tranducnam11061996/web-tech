# Database Statistics Summary

**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Database:** hanoi23_db
**Total Tables:** 243

---

## Module Breakdown

| Module | Table Prefix | Count | Description |
|--------|--------------|-------|-------------|
| Products | `idv_sell_product_*` | 11 | Product catalog, info, price, reviews, images |
| Sellers | `idv_seller_*` | 37 | Seller management, orders, reviews, content |
| Customers | `idv_customer_*` | 10 | Customer accounts, addresses, groups, points |
| Orders | `build_*`, `idv_order_*` | 4 | Shopping cart, orders, requests |
| ERP | `erp_*` | 11 | ERP sync, pricing, inventory per store |
| Categories | `idv_*category*` | 8 | Product & article categories |
| Attributes | `idv_attribute_*` | 6 | Product attributes & values |
| Content/CMS | `idv_article_*`, `idv_page_*`, `idv_template_*` | 12 | Articles, pages, templates |
| Media | `idv_gallery*`, `idv_movie*`, `idv_user_upload` | 6 | Images, videos, uploads |
| Promotions | `idv_promotion*`, `idv_coupon*`, `idv_combo*` | 7 | Promotions, coupons, deals |
| Payments | `idv_payinstall_*` | 7 | Installment payments, periods |
| SEO/Search | `idv_search_*`, `idv_url` | 6 | Search, URL management |
| Analytics | `idv_visit_*`, `idv_report_*` | 13 | Visit tracking, reports |
| Logistics | `shipping_*`, `province_*`, `idv_province_*` | 6 | Shipping, provinces, districts |
| Settings | `idv_settings`, `idv_cache*` | 4 | System settings, caching |
| Users | `idv_user_*`, `web_user_info` | 6 | User comments, likes, uploads |
| Misc | Others | 34 | Various utility tables |

---

## Top 20 Most Important Tables

Based on business logic importance:

1. **idv_sell_product_store** - Main product catalog (49 cols)
2. **build_buy** - Orders & shopping cart
3. **idv_customer** - Customer accounts
4. **idv_seller** - Seller accounts
5. **idv_sell_product_info** - Product details
6. **idv_sell_product_price** - Product pricing
7. **idv_product_category** - Category tree
8. **erp_product_store** - ERP product sync
9. **build_buy_item** - Order items
10. **idv_seller_order** - Seller orders
11. **idv_customer_address** - Shipping addresses
12. **idv_sell_product_review** - Reviews
13. **idv_attribute** - Product attributes
14. **idv_product_attribute** - Product-attribute relations
15. **idv_promotion** - Promotions
16. **idv_coupon** - Coupon codes
17. **idv_gallery** - Image galleries
18. **idv_visit_summary** - Analytics summary
19. **idv_search_fulltext** - Search index
20. **shipping_company** - Shipping carriers

---

## Column Type Distribution

| Data Type | Count | Percentage |
|-----------|-------|------------|
| varchar | ~1,500 | 35% |
| int | ~1,200 | 28% |
| text | ~400 | 9% |
| mediumint | ~350 | 8% |
| datetime | ~200 | 5% |
| smallint | ~180 | 4% |
| tinyint | ~150 | 3% |
| char | ~100 | 2% |
| Others | ~200 | 6% |

---

## Indexes Overview

- **Primary Keys:** ~200 tables (most use `id`)
- **Foreign Keys:** Limited - mostly application-level joins
- **Secondary Indexes:** Common on:
  - `url_hash` (for URL lookups)
  - `customerId` (for customer data)
  - `productId` / `product_cat` (for product queries)
  - `sellerId` (for seller operations)
  - `status` (for filtering)

---

## Data Volume Estimates

Based on column types and typical e-commerce patterns:

| Table Type | Estimated Rows (typical) | Purpose |
|------------|-------------------------|---------|
| Products | 10,000 - 100,000 | Catalog size |
| Customers | 50,000 - 500,000 | User base |
| Orders | 100,000 - 1,000,000 | Order history |
| Order Items | 500,000 - 5,000,000 | Line items |
| Reviews | 50,000 - 200,000 | Product reviews |
| Visits | 1,000,000 - 10,000,000 | Analytics |
| Category | 100 - 1,000 | Taxonomy |
| Attributes | 500 - 2,000 | Product specs |

---

## Performance Considerations

1. **Denormalized Design:** Many tables have 40+ columns (store tables) for read performance
2. **Missing Indexes:** Consider adding indexes on:
   - Foreign key columns (`*_id`)
   - Status columns (for filtering)
   - Date columns (for range queries)

3. **Archival Strategy:** Temporary tables (`*_tmp`) suggest data archiving process

4. **Charset:** `latin1` - consider migrating to `utf8mb4` for full Unicode support

5. **ERP Sync:** Separate `erp_*` tables indicate integration with external ERP system

---

## Common Query Patterns

### 1. Product Lookup by URL
```sql
SELECT * FROM idv_sell_product_store
WHERE url_hash = ? AND url = ?
```
(Uses `url_hash` index)

### 2. Customer Orders
```sql
SELECT b.*, SUM(bi.price * bi.quantity) as total
FROM build_buy b
JOIN build_buy_item bi ON b.id = bi.buy_id
WHERE b.customerId = ?
GROUP BY b.id
```

### 3. Seller Products
```sql
SELECT p.* FROM idv_sell_product_store p
JOIN erp_product_store e ON p.realProId = e.product_id
WHERE e.store_id = ?
```

### 4. Category Products
```sql
SELECT p.* FROM idv_sell_product_store p
WHERE FIND_IN_SET(?, p.product_cat) > 0
```

---

## Migration Recommendations

### To utf8mb4
```sql
ALTER DATABASE hanoi23_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- For each table
ALTER TABLE table_name CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Add Missing Indexes
```sql
-- Common foreign keys
CREATE INDEX idx_customerId ON build_buy(customerId);
CREATE INDEX idx_sellerId ON idv_seller_order(sellerId);
CREATE INDEX idx_productId ON build_buy_item(productId);
CREATE INDEX idx_status ON build_buy(status);
```

---

## Security Notes

⚠️ **Current state:** Development database with `root` user, no password
- ✅ Acceptable for local development
- ❌ **DO NOT** use in production
- 🔒 Production should use:
  - Dedicated MySQL users with minimal privileges
  - Strong passwords
  - SSL/TLS connections
  - Firewall restrictions

---

## File Locations

```
d:\tech-web-admin\
├── scripts/
│   └── analyze-database.ps1        # Schema analysis script
├── database-docs/
│   ├── DATABASE_SCHEMA.md          # Full schema (auto-generated)
│   └── QUICK_REFERENCE.md          # Quick lookup
├── CLAUDE.md                       # AI context
├── README.md                       # This file
└── .env                            # DB credentials
```

---

## Script Output

Running `analyze-database.ps1` generates:

1. **Table listing** with column counts
2. **CREATE TABLE** statements (full DDL)
3. **Column details** with predicted meanings
4. **Index information**
5. **Statistics summary**

**File size estimate:** ~5-10 MB depending on output format

---

## Quick Commands

```powershell
# Run analysis
.\run-analysis.bat

# Or manually
powershell -ExecutionPolicy Bypass -File .\scripts\analyze-database.ps1

# Check MySQL connection
mysql -u root -e "SELECT COUNT(*) FROM hanoi23_db.idv_sell_product_store;"

# List all tables
mysql -u root -e "SHOW TABLES FROM hanoi23_db;" | findstr /v "Tables_in"
```

---

## Support

For questions about:
- **Schema structure:** See `DATABASE_SCHEMA.md`
- **Quick lookup:** See `QUICK_REFERENCE.md`
- **Project context:** See `CLAUDE.md`
- **General info:** See `README.md`

---

**Stats generated:** Automated via PowerShell script
**Total tables analyzed:** 243
**Analysis time:** ~2-3 minutes
**Next analysis:** Run `analyze-database.ps1` after schema changes
