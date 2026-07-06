# Database Quick Reference

**Database:** `hanoi23_db`  
**Verified:** `2026-07-06`  
**Tables:** `241`

## Product read model

```text
idv_sell_product_store p
  1:1 idv_sell_product_price pr ON pr.id = p.id
  N:M idv_seller_category c
      via idv_product_category pc
  N:M idv_attribute_value v
      via idv_product_attribute pa
  0:N idv_url u
      via generated id_path
```

Sản phẩm checkout được coi là available khi:

```sql
pr.isOn = 1 AND pr.price > 0
```

## Category products đúng schema

```sql
SELECT DISTINCT
  p.id,
  p.storeSKU,
  p.proName,
  pr.price,
  pr.market_price
FROM idv_sell_product_store p
JOIN idv_sell_product_price pr
  ON pr.id = p.id
JOIN idv_product_category pc
  ON pc.pro_id = p.id
WHERE pc.category_id = ?
  AND pr.isOn = 1
ORDER BY p.id DESC
LIMIT ? OFFSET ?;
```

Không join `idv_product_category` như một bảng metadata có cột `name`; tên category nằm ở `idv_seller_category`.

## Category metadata

```sql
SELECT c.id, c.parentId, c.name, c.url, c.ordering
FROM idv_seller_category c
WHERE c.parentId = ?
ORDER BY c.ordering DESC, c.id DESC;
```

## Attribute count pattern

Không chạy correlated count cho từng value. Dùng aggregate một lần:

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

## Product slug

```sql
SELECT u.request_path
FROM idv_url u
WHERE u.id_path = CONCAT(
  'module:product/view:product-detail/view_id:',
  ?
);
```

Frontend phải strip slash đầu trước khi tạo `href` nội bộ.

## Cart quote

Input:

```json
{
  "items": [
    { "productId": 90451, "quantity": 1 }
  ]
}
```

Backend query:

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

Không nhận `price`, `marketPrice`, `available` từ client làm nguồn tin cậy.

## Order write model

```text
build_buy.id
  -> build_buy_item.order_id
```

Mapping hiện tại:

| `build_buy` | Giá trị |
|---|---|
| `product_title` | Tên nếu một line; summary nếu nhiều line |
| `total_value` | Tổng quote verified |
| `product_id` | Product đầu tiên nếu một line; nếu nhiều là `0` |
| `buyer_info` | JSON customer/receiver/delivery/payment/invoice |
| `config` | JSON items/totals/note |
| `status` | `1` |

Mọi insert order phải nằm trong transaction.

## Useful runtime checks

```sql
SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'hanoi23_db';
```

```sql
SELECT id, product_title, total_value, status, create_time
FROM build_buy
ORDER BY id DESC
LIMIT 20;
```

```sql
SELECT order_id, product_id, title, product_price, quantity
FROM build_buy_item
WHERE order_id = ?
ORDER BY id;
```

## Important cautions

- Không có foreign key/cascade đầy đủ; transaction và validation ở app là bắt buộc.
- `build_buy.total_value` là `float`; không dùng cho phép tính tài chính mới nếu có thể migration.
- `build_buy_item.order_id` chưa có secondary index trong snapshot.
- Tất cả bảng đang dùng `latin1_swedish_ci`.
- Filter metadata có dữ liệu URL/script legacy; API phải sanitize.
- Không thêm index/migration chỉ dựa trên suy đoán; đo query và backup trước.

