# Kiến trúc Hệ thống (System Architecture Rules)

Tài liệu này định nghĩa bắt buộc về cách thức hoạt động và giao tiếp giữa các thư mục lõi của hệ thống HACOM E-commerce. Bất kỳ AI (Claude, ChatGPT, Gemini, v.v) hay lập trình viên nào khi code đều **BẮT BUỘC** phải đọc kỹ và tuân thủ nghiêm ngặt để duy trì cấu trúc Headless.

## 1. Nguyên tắc Phân tách Trách nhiệm (Separation of Concerns)

### A. Folder `D:\web-tech\web-admin` (Core Backend + Admin UI)
- **Database Access**: Là NƠI DUY NHẤT được phép cấu hình kết nối và truy vấn trực tiếp vào Database `hanoi23_db` (thông qua MySQL `pool`). 
- **Admin UI**: Cung cấp giao diện quản trị nội bộ cho HACOM.
- **API Provider**: Chịu trách nhiệm xây dựng RESTful APIs (dùng Next.js Route Handlers tại `src/app/api/...`) trả dữ liệu JSON cho Front-end. Cần hỗ trợ phân trang (Pagination) và tính năng liên quan đến DB.
- *Quy tắc tuyệt đối*: Không bao giờ render giao diện của khách hàng (Storefront) tại thư mục này.

### B. Folder `D:\web-tech\font-end` (Customer Storefront)
- **No Direct DB Connection**: **TUYỆT ĐỐI KHÔNG** được cấu hình bất kỳ kết nối Database nào.
- **API Consumer**: Fetch dữ liệu từ API của `web-admin` (Port 3000).
- **Dynamic Gateway Routing (`app/[slug]/page.tsx`)**: Front-end không có các thư mục cứng như `/product` hay `/category`. Thay vào đó, nó dùng Dynamic Route `[slug]`. Nó sẽ ném slug lên API `web-admin` để phân giải qua bảng `idv_url`. Tuỳ thuộc API trả về `type: 'product'` hay `type: 'category'`, file này sẽ quyết định render `ProductPage` hay `CategoryPage` tương ứng.
- **Image Optimization**: BẮT BUỘC dùng `<ProgressiveImage />` (đặt tại `src/components/ProgressiveImage.tsx`) thay cho thẻ `<img />` thông thường để hỗ trợ Lazy Load và Shimmer Effect.
- **Smart Pagination**: Các trang danh sách (như Category) phải sử dụng tính năng phân trang thông minh (có dấu `...`) và gọi API kèm `?limit=24&page=X`. Giao diện phân trang tuân theo thiết kế bo góc `rounded-xl`, nút active màu xanh `#0b63e5`.

### C. Folder `D:\web-tech\media` (Static Media Storage)
- Nơi lưu trữ tập trung file ảnh vật lý.

## 2. Tiêu chuẩn Giao tiếp API (API Communication Standard)

Mọi API trả về từ `web-admin` cho `font-end` nên tuân theo một format JSON đồng nhất:

```json
{
  "success": true,
  "data": { ... },
  "pagination": { "total": 100, "page": 1, "limit": 24, "totalPages": 5 }, // NẾU LÀ DẠNG LIST
  "message": "Lấy dữ liệu thành công",
  "error": null
}
```
*Lưu ý: API luôn phải cấu hình CORS Header để `font-end` (Port 3001) có thể truy cập được từ Client-side.*

## 3. Workflow phát triển tính năng mới cho AI Assistants

Nếu nhận được yêu cầu phát triển tính năng từ User:
1. **Phân tích Database & Backend**: Viết API endpoint ở `web-admin/src/app/api/...`. Thực hiện truy vấn MySQL. Nhớ xử lý `limit`, `page`, và `COUNT(*)` nếu cần phân trang.
2. **Cập nhật Logic Routing (Nếu là trang mới)**: Nếu tính năng gắn với một URL Slug (như bài viết tin tức), hãy vào `web-admin/src/app/api/products/[slug]/route.ts` bổ sung quy tắc regex bóc tách ID từ bảng `idv_url`.
3. **Phát triển UI tại Frontend**: Vào thư mục `font-end`. Fetch API. Sử dụng `Tailwind CSS` thiết kế giao diện chuẩn phong cách *Premium Dark Mode* (Gradients, Glassmorphism, Neon glow).
4. **Luôn tái sử dụng Component**: Tận dụng `<ProgressiveImage />` cho ảnh và cấu trúc phân trang đã có sẵn.
