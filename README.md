# HACOM E-Commerce System (Monorepo-style Architecture)

Chào mừng đến với hệ thống bán lẻ đồ công nghệ HACOM. Dự án được chia tách theo kiến trúc Micro-frontend / Headless CMS nhằm đảm bảo tính bảo mật, khả năng mở rộng và hiệu năng cao.

## 📂 Cấu trúc Tổng quan (Workspace Structure)

Dự án nằm trong thư mục gốc `D:\web-tech\` và được chia thành 3 phân vùng hoạt động hoàn toàn độc lập nhưng giao tiếp chặt chẽ với nhau:

1. **`/web-admin` (Backend API & Admin Dashboard)**
   - **Vai trò**: Đóng vai trò là Server trung tâm (Backend). Trực tiếp kết nối và xử lý logic với cơ sở dữ liệu MySQL (`hanoi23_db`). Cung cấp hệ thống giao diện quản trị (Admin Dashboard) dành riêng cho nội bộ nhân viên HACOM.
   - **Giao tiếp**: Cung cấp các API Endpoints (RESTful hoặc Server Actions) để trả dữ liệu (JSON) cho Front-end.
   - **Công nghệ**: Next.js 15 (App Router), Tailwind CSS, MySQL2.

2. **`/font-end` (Customer-facing Storefront)**
   - **Vai trò**: Giao diện hiển thị bán hàng dành cho khách hàng cuối (Customer UI). Thư mục này **TUYỆT ĐỐI KHÔNG** được phép kết nối trực tiếp vào Database.
   - **Giao tiếp**: Call API tới `/web-admin` (Backend) để lấy danh sách sản phẩm, chi tiết sản phẩm, tạo đơn hàng,...
   - **Công nghệ**: Sẽ được khởi tạo bằng Next.js (App Router) hoặc React/Vite, tối ưu hóa mạnh mẽ cho SEO và tốc độ tải trang.

3. **`/media` (Centralized Media Storage)**
   - **Vai trò**: Thư mục lưu trữ tập trung toàn bộ các tệp tin tĩnh (Static Assets) như hình ảnh sản phẩm (`/product`), ảnh quảng cáo (`/banner`), video.
   - **Giao tiếp**: Được phục vụ như một Static File Server. Cả `web-admin` và `font-end` đều lấy link ảnh từ chung một nguồn này để tránh trùng lặp dung lượng.

## 🚀 Tiến độ Dự án (Roadmap & Status)

### Giai đoạn 1: Chuẩn hóa Backend (`/web-admin`) - **[HOÀN THÀNH]**
- Đã thiết lập xong hệ thống quản lý cơ sở dữ liệu MySQL.
- API Route đã hỗ trợ nhận diện Dynamic Slug, phân giải URL và hỗ trợ phân trang (Pagination) kèm CORS.

### Giai đoạn 2: Xây dựng Front-end (`/font-end`) - **[HOÀN THÀNH]**
- Đã khởi tạo Next.js (App Router) với Tailwind CSS.
- **Dynamic Routing Gateway**: File `[slug]/page.tsx` hoạt động hoàn hảo, tự động nhận biết là trang Sản Phẩm hay Danh Mục.
- **Tối ưu hóa UI/UX**: Tích hợp xong cơ chế Smart Pagination thông minh và `<ProgressiveImage />` hỗ trợ Shimmer Loading chuyên nghiệp.

### Giai đoạn 3: Tối ưu Lọc Động (Advanced Filtering System) - **[HOÀN THÀNH]**
- Xây dựng hoàn thiện hệ thống Filter Động (Dynamic Filters) đa chiều trên giao diện Category Page, giao tiếp chặt chẽ thông qua URL Search Parameters.
- Thuật toán Back-end linh hoạt bằng `HAVING COUNT(DISTINCT...)` giúp tính toán phần giao của đa thuộc tính và đếm số lượng hiển thị (`productCount`) realtime.
- Price Range UI thông minh tự nhận biết khoảng giá `min` và `max` từ Database, chống giật lag với debouncing, và hỗ trợ giao diện tiếng Việt ("Giá từ: ... đ").
- Giải quyết triệt để xung đột giữa Vanilla JS cũ và React State.

## 📜 Tài liệu bắt buộc đọc cho A.I Assistants
Để các AI có thể ngay lập tức hiểu hệ thống và code tiếp mà không làm phá vỡ kiến trúc, **BẮT BUỘC ĐỌC** các tài liệu sau:
1. `D:\web-tech\ARCHITECTURE.md` (Định nghĩa toàn cục về luồng dữ liệu 3 thư mục, cách gọi API và cơ chế URL slug).
2. `D:\web-tech\font-end\README.md` (Quy định khắt khe về UI/UX trên Frontend, không lưu ảnh local, luôn dùng ProgressiveImage).
3. `D:\web-tech\web-admin\README.md` & `AGENTS.md` (Nếu cần viết/sửa API Backend).
