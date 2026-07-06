# Tiến độ dự án HACOM

**Cập nhật:** 2026-07-06  
**Database:** `hanoi23_db`  
**Trạng thái tổng thể:** Feature-complete cho guest cart bản đầu; chưa production-ready cho checkout public.

## 1. Hoàn thành

| Hạng mục | Trạng thái | Xác minh |
|---|---|---|
| Audit schema runtime và quan hệ bảng | Hoàn thành | Kết nối trực tiếp DB, xác nhận 241 bảng |
| Dynamic product/category slug | Hoàn thành | `/laptop` và product detail smoke pass |
| Category SSR initial data | Hoàn thành | Build và browser pass |
| Dynamic filter, price, sort, pagination | Hoàn thành | Browser smoke pass |
| Attribute aggregate query | Hoàn thành | 53-61ms warm với category 159 |
| Products API query optimization | Hoàn thành | 44-45ms warm với category 159 |
| Guest cart localStorage | Hoàn thành | Reload giữ cart, badge đồng bộ |
| Cart quote API | Hoàn thành | Giá và trạng thái lấy từ DB |
| Checkout UI/data flow | Hoàn thành bản đầu | Selected item flow pass |
| Order transaction API | Hoàn thành code | Empty input trả 400; chưa tạo order test E2E |
| Header/filter React state | Hoàn thành | Không còn caller `window.toggle*` |
| Bỏ global `main.js` | Hoàn thành | Build và menu smoke pass |
| Lazy-load TinyMCE | Hoàn thành | List không tải; edit mới tải |
| Legacy attribute sanitization | Hoàn thành | Không còn URL/script trong `/laptop` filter |
| Build hai ứng dụng | Hoàn thành | Cả hai pass ngày 2026-07-06 |

## 2. Review Findings Còn Mở

### P1 - Trước khi đưa checkout ra production

- Thêm rate-limit/anti-spam cho `POST /api/orders`.
- Giới hạn CORS theo storefront origin ở production.
- Không trả `error.message` nội bộ ra response public.
- Thêm `.env`, `.env.local`, `.env.*.local` vào `.gitignore`; giữ `.env.example`.

### P2 - Logic và độ tin cậy

- Reject quantity không phải integer `1..99`; không tự clamp dữ liệu request sai.
- Bắt buộc địa chỉ khi `delivery.method = shipping`.
- Bắt buộc receiver name/phone khi receiver được bật.
- Validate format số điện thoại, email và tax code ở backend.
- Cart summary chỉ hiển thị tổng tiền verified hoặc giữ trạng thái loading cho đến khi quote hoàn tất.
- Thêm idempotency key cho tạo đơn để tránh double submit/retry tạo hai order.

### P2 - Test coverage

- Integration test quote: not found, inactive, zero price, duplicate product, quantity boundary.
- Integration test order transaction: một header, nhiều lines, rollback khi line insert lỗi.
- Browser test: saved-for-later, select all, remove selected, empty cart, direct checkout không item.
- Test TinyMCE khi có nhiều editor trên cùng page.

### P3 - Cleanup và tài liệu

- Rà và xóa có kiểm soát các file debug/patch lịch sử ở root: `fix_api.js`, `patch_is_loading.js`, `update_page.js`, `original.tsx`, `temp.tsx`, `debug.json`, `test_api.json`.
- Rà `font-end/out.html` và `web-admin/product.html` trước khi quyết định giữ/xóa.
- Chuẩn hóa line ending để giảm cảnh báo LF/CRLF.
- Cân nhắc migration collation từ `latin1_swedish_ci` sang `utf8mb4`; cần kế hoạch riêng và backup.

## 3. Verification Matrix

| Flow | Kết quả | Ghi chú |
|---|---|---|
| `/` | Pass build | Static route |
| `/laptop` | Pass browser | 366 sản phẩm tại lần test |
| Product detail | Pass browser | Add cart và badge pass |
| `/gio-hang` | Pass browser | Tăng quantity và quote pass |
| `/thanh-toan` | Pass browser | Form render, chưa submit order test |
| `/tin-tuc/[slug]` | Pass build | Dynamic server route |
| Admin product list | Pass browser | TinyMCE không tải |
| Admin `/news/edit` | Pass browser | TinyMCE tải và khởi tạo |
| Invalid category id | Pass API | HTTP 400 |
| Empty order | Pass API | HTTP 400 |

## 4. Definition of Done Cho Checkout Production

- [ ] Hoàn thành toàn bộ P1.
- [ ] Quantity/address/receiver validation chạy ở backend.
- [ ] Có test transaction commit và rollback.
- [ ] Có idempotency hoặc cơ chế chống double submit.
- [ ] Có logging order không chứa dữ liệu nhạy cảm.
- [ ] CORS và DB credential được cấu hình theo môi trường.
- [ ] Thực hiện một order E2E trên database test/staging.

