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

### Cấu trúc API Lõi Mới (Advanced APIs)
Để phục vụ bộ lọc động và nội dung, các API sau đã được xây dựng và **phải được tham khảo/bảo trì**:
1. **`/api/categories`**: Trả về danh sách danh mục con kèm `productCount` được tính toán động (chỉ đếm sản phẩm có `isOn=1` và `price > 0`).
2. **`/api/categories/attributes`**: Lấy cấu trúc bộ lọc thuộc tính. Trả về mảng `values` kèm `productCount` tính bằng Subquery JOIN.
3. **`/api/categories/price-bounds`**: Truy xuất `MIN(price)` và `MAX(price)` của danh mục để setup giới hạn của thanh kéo thả (Dual-range Slider).
4. **`/api/products`**: Hỗ trợ nhận n tham số động (Dynamic Filter Params) trên URL (`?kich-thuoc-man-hinh=...`) và áp dụng truy vấn `HAVING COUNT(DISTINCT ...)`.
5. **`/api/news` & `/api/news-category`**: Trả về dữ liệu bài viết (dùng LEFT JOIN `idv_seller_news_content`) và danh mục bài viết. Khi dùng Next.js 15, bắt buộc `await params` khi lấy slug.

## 3. Workflow phát triển tính năng mới cho AI Assistants

Nếu nhận được yêu cầu phát triển tính năng từ User:
1. **Phân tích Database & Backend**: Viết API endpoint ở `web-admin/src/app/api/...`. Thực hiện truy vấn MySQL. Luôn cấp CORS Header `Access-Control-Allow-Origin: *` ở mọi method GET/POST/OPTIONS.
2. **Cập nhật Logic Routing (Nếu là trang mới)**: Nếu tính năng gắn với một URL Slug, tạo Dynamic Route `[slug]` hoặc bổ sung quy tắc bóc tách dữ liệu linh hoạt (ví dụ: fallback từ bài viết sang danh mục nếu chung cấp route). 
3. **Phát triển UI tại Frontend (Luôn ưu tiên Server Component)**:
   - Các trang nội dung (Sản phẩm, Bài viết) **BẮT BUỘC** làm dạng `Server Component` (không dùng `"use client"` trừ khi có hook). 
   - Sử dụng hàm `generateMetadata()` để sinh thẻ `<title>`, `<meta>` cho SEO dựa trên API.
   - Thêm cờ `{ next: { revalidate: 60 } }` khi fetch API từ web-admin để tận dụng ISR Cache của Next.js chống quá tải DB.
4. **Xử lý Mã HTML thô (Raw CMS HTML)**: Khi render mã HTML lấy từ CSDL:
   - Không sử dụng Tailwind Typography (`prose`) vì có thể xung đột với style tĩnh (Inline Style) cũ.
   - Luôn sử dụng kỹ thuật **Tailwind Arbitrary Variants** bọc ngoài: `className="[&_h1]:text-white [&_p]:mb-4 ..."` kết hợp với `dangerouslySetInnerHTML`.
   - Phải replace các đường dẫn ảnh tĩnh tương đối (ví dụ `../media/news/...`) sang đường dẫn tuyệt đối (server URL) trước khi gắn vào DOM.
5. **Luôn tái sử dụng Component**: Tận dụng `<ProgressiveImage />` cho mọi hình ảnh và cấu trúc UI hiện đại có sẵn.
