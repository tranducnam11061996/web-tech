# HACOM Backend API và Admin Dashboard (`web-admin`)

Ứng dụng chạy bằng Next.js `16.2.9`, React `19.2`, Tailwind CSS 4 và MySQL2 tại cổng `3000`.

## Trách nhiệm

- Kết nối duy nhất tới MySQL `hanoi23_db`.
- Cung cấp Admin Dashboard nội bộ.
- Cung cấp REST API cho storefront.
- Xác thực product, price và trạng thái bán trước khi tạo order.
- Quản lý TinyMCE offline cho các trang edit.

## Database config

`src/lib/db.ts` ưu tiên:

1. `process.env.DATABASE_URL`.
2. `DATABASE_URL` trong `.env` của app hoặc workspace parent.
3. `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

```env
DATABASE_URL="mysql://user:password@127.0.0.1:3306/hanoi23_db"
```

Không commit file credential. Production phải dùng DB user riêng, mật khẩu mạnh và network restriction.

## API storefront

| Endpoint | Method | Chức năng |
|---|---|---|
| `/api/products/[slug]` | `GET` | Resolve product/category slug |
| `/api/products` | `GET` | List, pagination và dynamic filters |
| `/api/categories` | `GET` | Subcategories |
| `/api/categories/price-bounds` | `GET` | Min/max price |
| `/api/categories/attributes` | `GET` | Attribute/brand filters |
| `/api/cart/quote` | `GET`, `POST`, `OPTIONS` | Quote cart từ DB |
| `/api/orders` | `GET`, `POST`, `OPTIONS` | Tạo order transaction |
| `/api/news/[slug]` | `GET` | Article detail |
| `/api/news-category/[slug]` | `GET` | News category |

## Quote và order

`src/lib/cart-quote.ts` là logic dùng chung:

- Deduplicate item theo `productId`.
- Query `idv_sell_product_store`, `idv_sell_product_price`, `idv_url`.
- Available khi `isOn = 1` và `price > 0`.
- Tính line total và totals từ DB.

`POST /api/orders`:

1. Re-quote toàn bộ item.
2. Reject cart rỗng hoặc có item unavailable.
3. Validate tối thiểu customer name/phone.
4. Begin transaction.
5. Insert một row `build_buy`.
6. Insert nhiều row `build_buy_item`.
7. Commit hoặc rollback.

Các validation/rate-limit còn thiếu được theo dõi tại `../PROJECT_PROGRESS.md`.

## Category/product query rules

- Count query chỉ join bảng cần thiết.
- Category filter join trực tiếp `idv_product_category`.
- Query độc lập chạy bằng `Promise.all`.
- Attribute count dùng derived aggregate `GROUP BY attr_value_id`.
- Attribute metadata/value chứa URL/script legacy phải được sanitize trước khi response.
- Clamp `page` và `limit`; reject numeric filter sai.

## TinyMCE offline

- Runtime asset nằm trong `public/tinymce.min.js` cùng themes/plugins/skins.
- Không load TinyMCE trong root layout.
- `RichTextEditor` dùng `next/script` và chỉ init khi script ready.
- Trang list không được tải TinyMCE.
- Chỉ dùng editor cho nội dung chính; field SEO dùng input/textarea thường.

## Admin performance

- Product, brand và news list chạy count/list song song.
- Chỉ select cột cần dùng.
- Pagination clamp `1..100` ở các list đã tối ưu.
- Storefront URL lấy từ `STOREFRONT_URL` hoặc `NEXT_PUBLIC_STOREFRONT_URL`.
- `optimizePackageImports` được bật cho `lucide-react`.

## Commands

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
```

## Tài liệu DB

- `database-docs/DATABASE_SCHEMA.md`: schema runtime quan trọng.
- `database-docs/QUICK_REFERENCE.md`: quan hệ và query mẫu.
- `database-docs/STATISTICS.md`: số liệu database tại lần audit gần nhất.


## Admin CRUD API

Admin write endpoints are same-origin and require `ADMIN_WRITE_ENABLED=true`.

| Endpoint | Methods | Function |
|---|---|---|
| `/api/admin/products` | `GET`, `POST` | List/create products, bulk action |
| `/api/admin/products/[id]` | `GET`, `PATCH`, `DELETE` | Read/update/hide or permanent-delete product |
| `/api/admin/product-categories` | `GET`, `POST` | List/create product categories, bulk action |
| `/api/admin/product-categories/[id]` | `GET`, `PATCH`, `DELETE` | Read/update/hide or permanent-delete product category |
| `/api/admin/articles` | `GET`, `POST` | List/create articles, bulk action |
| `/api/admin/articles/[id]` | `GET`, `PATCH`, `DELETE` | Read/update/hide or permanent-delete article |
| `/api/admin/article-categories` | `GET`, `POST` | List/create article categories, bulk action |
| `/api/admin/article-categories/[id]` | `GET`, `PATCH`, `DELETE` | Read/update/hide or permanent-delete article category |
| `/api/admin/migrate` | `POST` | Create admin helper tables when writes are enabled |

Run helper-table migration with:

```powershell
$env:ADMIN_WRITE_ENABLED="true"
npm.cmd run admin:migrate
```

See `database-docs/ADMIN_MIGRATION_GUIDE.md`.
