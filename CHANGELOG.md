# Changelog

Các thay đổi đáng chú ý của workspace HACOM được ghi theo ngày triển khai.

## 2026-07-06

### Added

- Guest cart tại storefront, lưu bằng `localStorage` key `hacom.cart.v1`.
- Chọn từng sản phẩm/chọn tất cả, cập nhật số lượng, xóa, mua sau và đưa lại vào giỏ.
- Header cart badge đồng bộ bằng `useSyncExternalStore`.
- `POST /api/cart/quote` để xác thực product, giá và trạng thái bán từ DB.
- `POST /api/orders` để re-quote và insert transaction vào `build_buy`, `build_buy_item`.
- Checkout chỉ sử dụng item selected và không thuộc nhóm saved-for-later.
- React menu data trong `font-end/src/components/menuData.ts`.

### Changed

- `/[slug]` fetch dữ liệu ban đầu ở server thay vì client-only loading.
- `CategoryClient` tách product fetch khỏi category metadata fetch.
- Category fetch sử dụng `AbortController`, `Promise.all`, `Map` và derived state.
- `/api/categories/attributes` thay correlated count bằng derived aggregate query.
- `/api/products` clamp pagination, tối giản count query và join trực tiếp category junction.
- `ProgressiveImage` cache placeholder và dùng native lazy loading.
- `ProductCarousel` dùng ref cho drag delta và dừng timer khi tab ẩn.
- Admin product/brand/news list chạy count và list song song.
- `db.ts` ưu tiên `DATABASE_URL` và fallback cấu hình DB cũ.
- TinyMCE chỉ tải khi `RichTextEditor` mount.
- Bổ sung `optimizePackageImports` cho `lucide-react` ở hai app.

### Fixed

- Lỗi module runtime trên route category sau khi dọn/rebuild `.next`.
- Loại bỏ phụ thuộc `window.toggleMenu`, `window.toggleFilter`, `window.toggleSidebarSearch`.
- Không còn nạp `public/main.js` toàn cục.
- Fix hydration warning của cart server snapshot bằng singleton empty cart.
- Lọc filter value legacy chứa `javascript:void(0)` hoặc URL.
- Không còn render URL placeholder từ `idv_attribute.icon` như text.
- Xóa bản TinyMCE trùng tại `web-admin/tinymce.min.js`; giữ bản runtime trong `public/`.

### Verification

- Build `font-end`: pass.
- Build `web-admin`: pass.
- Smoke test product detail -> cart -> checkout: pass, không submit order test.
- Smoke test category menu/filter/pagination: pass.
- Smoke test admin product list và TinyMCE tại `/news/edit`: pass.
- Attribute API category `159`: khoảng `53-61ms` warm.
- Products API category `159`: khoảng `44-45ms` warm.

### Known Gaps

- Quantity sai đang bị clamp thay vì reject ở quote/order input.
- Order endpoint chưa có rate-limit/anti-spam và production CORS allowlist.
- Shipping/receiver/invoice validation mới ở mức tối thiểu.
- Chưa có automated integration test cho transaction tạo đơn.
- Cart có thể hiển thị cache giá localStorage trong thời gian quote đang chạy.

