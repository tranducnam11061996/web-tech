# Database Statistics

**Database:** `hanoi23_db`  
**Verified:** `2026-07-06`  
**Source:** `information_schema`

## Physical summary

| Metric | Value |
|---|---:|
| Total tables | 241 |
| InnoDB | 113 |
| MyISAM | 128 |
| `latin1_swedish_ci` tables | 241 |

## Prefix/module distribution

Phân nhóm là heuristic theo tên bảng, dùng để định hướng audit.

| Group | Tables |
|---|---:|
| `idv_seller_*` | 50 |
| `idv_sell_product_*` | 13 |
| `erp_*` | 11 |
| Analytics (`idv_visit_*`, `idv_report_*`) | 9 |
| `idv_customer_*` | 8 |
| Attribute core | 7 |
| `build_*` | 5 |
| `idv_order_*` | 1 |
| Category-related names | 17 |
| Other | 120 |

Một bảng có thể phù hợp nhiều domain về nghiệp vụ; bảng trên chỉ gán mỗi table vào một group heuristic.

## Core table estimates

| Table | Engine | Estimated rows |
|---|---|---:|
| `idv_product_attribute` | InnoDB | 242,304 |
| `idv_product_category` | InnoDB | 88,057 |
| `idv_url` | InnoDB | 32,709 |
| `idv_sell_product_price` | InnoDB | 28,616 |
| `idv_sell_product_store` | InnoDB | 21,158 |
| `idv_attribute_category` | InnoDB | 3,885 |
| `idv_seller_news` | InnoDB | 2,485 |
| `idv_attribute_value` | InnoDB | 2,446 |
| `idv_seller_news_content` | InnoDB | 2,365 |
| `idv_seller_category` | InnoDB | 1,617 |
| `idv_attribute` | InnoDB | 347 |
| `build_buy_item` | InnoDB | 33 |
| `build_buy` | InnoDB | 6 |

InnoDB row count là estimate và có thể lệch so với `COUNT(*)`.

## Performance observations

- `idv_product_attribute` và `idv_product_category` là hai junction table lớn nhất trong flow category.
- Existing indexes hỗ trợ lookup đơn cột `pro_id`, `attr_value_id`, `category_id`.
- Attribute count đã được tối ưu bằng derived aggregate, không chạy count lặp theo value.
- Product count/list hiện chạy song song ở API list.
- `build_buy_item.order_id` chưa có index; chưa thêm migration vì volume hiện nhỏ và cần benchmark use case admin order trước.

## Data quality observations

- Attribute icon/value có dữ liệu legacy dạng URL và `javascript:void(0)`.
- API `/api/categories/attributes` sanitize dữ liệu trước khi trả storefront.
- Collation legacy có nguy cơ tạo mojibake khi client/connection encoding không đồng nhất.
- Database trộn InnoDB và MyISAM, nên không được giả định mọi module hỗ trợ transaction như nhau.

## Security observations

- Credential local hiện dùng development database.
- Production cần dedicated DB user với least privilege.
- Không commit `.env` hoặc log connection string.
- Không expose raw DB error qua API public.

## Re-check commands

```sql
SELECT engine, COUNT(*)
FROM information_schema.tables
WHERE table_schema = 'hanoi23_db'
GROUP BY engine;
```

```sql
SELECT table_name, table_rows, engine, table_collation
FROM information_schema.tables
WHERE table_schema = 'hanoi23_db'
ORDER BY table_rows DESC;
```

Chạy lại audit sau migration, import DB mới hoặc thay đổi schema.

