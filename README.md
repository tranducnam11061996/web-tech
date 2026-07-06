# HACOM E-commerce Workspace

Workspace này gồm storefront dành cho khách hàng và hệ thống backend/admin dùng chung cơ sở dữ liệu MySQL `hanoi23_db`.

## Thành phần

| Thư mục | Vai trò | Công nghệ | Cổng mặc định |
|---|---|---|---|
| `font-end` | Storefront khách hàng | Next.js 15, React 19, Tailwind CSS 3 | `3001` |
| `web-admin` | REST API và Admin Dashboard | Next.js 16.2.9, React 19.2, Tailwind CSS 4, MySQL2 | `3000` |
| `web-admin/database-docs` | Tài liệu schema runtime | Markdown, dữ liệu kiểm tra từ `hanoi23_db` | - |

Storefront không được kết nối trực tiếp MySQL. Mọi dữ liệu sản phẩm, danh mục, báo giá giỏ hàng và tạo đơn đều đi qua API của `web-admin`.

## Khởi chạy local

```powershell
cd D:\web-tech\web-admin
npm.cmd install
npm.cmd run dev
```

```powershell
cd D:\web-tech\font-end
npm.cmd install
npm.cmd run dev
```

Truy cập:

- Storefront: `http://localhost:3001`
- Admin/API: `http://localhost:3000`

## Biến môi trường

Backend ưu tiên `DATABASE_URL`, sau đó mới fallback về `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

```env
DATABASE_URL="mysql://user:password@127.0.0.1:3306/hanoi23_db"
NEXT_PUBLIC_API_URL="http://localhost:3000"
STOREFRONT_URL="http://localhost:3001"
```

Không commit `.env` hoặc `.env.local`. Xem rủi ro đang mở trong `PROJECT_PROGRESS.md`.

## Chức năng đã triển khai

- Dynamic slug gateway cho sản phẩm và danh mục, fetch dữ liệu ban đầu ở server.
- Danh mục sản phẩm có phân trang, lọc thuộc tính, lọc giá và sort.
- API category attributes dùng aggregate query và lọc dữ liệu legacy không hợp lệ.
- Guest cart lưu tại `localStorage` với key `hacom.cart.v1`.
- Quote giỏ hàng và checkout luôn xác thực lại giá/trạng thái sản phẩm ở backend.
- Tạo đơn trong transaction vào `build_buy` và `build_buy_item`.
- Header badge, mua sau, chọn sản phẩm, cập nhật số lượng và checkout.
- TinyMCE offline chỉ tải khi `RichTextEditor` được mount.
- `main.js` không còn được nạp global; menu và filter dùng React state.

## Kiểm thử gần nhất

Ngày `2026-07-06`:

- `font-end`: `npm.cmd run build` pass.
- `web-admin`: `npm.cmd run build` pass.
- Smoke test: `/laptop`, product detail, `/gio-hang`, `/thanh-toan`, admin product list và `/news/edit` pass.
- `/api/categories/attributes?categoryId=159`: khoảng `53-61ms` warm.
- `/api/products?category_id=159&limit=24&page=1`: khoảng `44-45ms` warm.
- Empty order và category id sai trả HTTP `400`.

## Tài liệu

- `ARCHITECTURE.md`: ranh giới hệ thống và data flow.
- `PROJECT_PROGRESS.md`: tiến độ, mức độ xác minh và backlog ưu tiên.
- `CHANGELOG.md`: lịch sử thay đổi theo ngày.
- `font-end/README.md`: kiến trúc storefront.
- `web-admin/README.md`: backend/admin và API.
- `web-admin/database-docs/QUICK_REFERENCE.md`: quan hệ bảng thường dùng.
- `web-admin/database-docs/DATABASE_SCHEMA.md`: snapshot schema runtime đã xác minh.

