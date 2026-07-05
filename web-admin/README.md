# HACOM Admin Dashboard

Hệ thống quản lý Admin Dashboard chuyên nghiệp dành cho hệ thống bán lẻ đồ công nghệ (HACOM). Được thiết kế theo phong cách "Gaming/Tech" hiện đại (Dark Theme, Neon Accents, Glassmorphism) với mục tiêu tối ưu trải nghiệm người dùng (UX) và tối đa hóa không gian làm việc.

## 🚀 Công nghệ sử dụng

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Ngôn ngữ**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database**: MySQL (sử dụng thư viện `mysql2/promise`)
- **Khác**: `php-serialize` (đọc data Legacy), `clsx`, `tailwind-merge`

## ✨ Các tính năng nổi bật

1. **Giao diện Đậm chất Tech / Dark Mode**:
   - Sử dụng tông màu tối (`#0a0a0f`) phối hợp với hiệu ứng ánh sáng Neon (đỏ, xanh, vàng).
   - Thiết kế dạng kính mờ (Glassmorphism) tạo chiều sâu cho các bảng điều khiển.
   - Giao diện trải dài toàn màn hình giúp tối ưu hóa không gian hiển thị dữ liệu lớn.

2. **Hệ thống Menu (Sidebar) thông minh**:
   - Khả năng mở rộng/thu gọn (Expand/Collapse) đa cấp bậc.
   - Thao tác chuyển đổi trạng thái bằng viền sáng, đổ bóng Neon.

3. **Quản lý Danh sách Sản phẩm**:
   - Bảng dữ liệu (Data table) tích hợp Filter đa dạng (Từ khóa, ngày tháng, trạng thái, thương hiệu).
   - Cơ chế tải ảnh thông minh (`ImageWithFallback`): Tự động hiển thị placeholder base64 để chống vỡ layout khi ảnh bị lỗi mạng.
   - Tối ưu hóa với Skeleton Loading.

4. **Trang Thêm mới / Chỉnh sửa Sản phẩm (`/products/edit`)**:
   - Được phân chia cực kỳ khoa học thành 7 Tab chức năng chính.
   - Có tích hợp TinyMCE Offline, bộ lọc đa danh mục.

5. **Module Quản lý Combo Set (`/products/combo-set`)**:
   - Tích hợp CRUD (Thêm, Sửa, Xóa) cho Combo Set.
   - **Giao diện chỉnh sửa gộp (One-page edit)**: Cơ chế thu phóng (Expand/Collapse) thông minh tự động nhận diện số lượng nhóm.
   - **Kéo/Thả (Drag & Drop)**: Hỗ trợ kéo thả bằng HTML5 Native để sắp xếp vị trí Nhóm và Sản phẩm trong nhóm cực kỳ mượt mà.
   - **Danh sách liên kết**: Phân tích quan hệ `combo_set_product` (field `set_id`) để hiển thị toàn bộ list sản phẩm đang áp dụng Combo.

## 🤖 Quy Tắc Tái Sử Dụng Code (Dành cho AI & Lập trình viên)

Để đồng bộ mã nguồn và tránh "reinvent the wheel" (viết lại những thứ đã có), khi phát triển tính năng mới bắt buộc phải tuân thủ các quy tắc tận dụng component/module sau:

1. **Sử dụng chức năng "Tìm kiếm Sản Phẩm" có sẵn**:
   - Khi cần truy vấn sản phẩm trong Database, hãy sử dụng file Server Action đã được xây dựng sẵn tại `src/actions/product.ts` (`searchProducts()`).
   - Hệ thống tìm kiếm này đã được tối ưu hóa câu SQL để có thể quét đồng thời **Mã ID (`id`)**, **Mã Sản phẩm (`storeSKU`)**, và **Tên sản phẩm (`proName`)**.

2. **Sử dụng chức năng "Phân Trang" (Pagination) có sẵn**:
   - Đối với mọi màn hình danh sách có sử dụng Server Components, hãy sử dụng component `<Pagination />` tại `src/components/shared/Pagination.tsx`.
   - Component này xử lý sẵn logic đẩy tham số `?page=` lên URL, hỗ trợ responsive và mang đậm ngôn ngữ thiết kế Dark Tech. 

3. **Sử dụng chức năng "Popup Thêm Sản Phẩm" (ProductSelectModal)**:
   - Nếu màn hình bạn code có bất kỳ nghiệp vụ nào yêu cầu "Chọn sản phẩm", **tuyệt đối không** xây dựng lại một modal mới.
   - Hãy import và sử dụng ngay `<ProductSelectModal />` tại `src/components/shared/ProductSelectModal.tsx`.
   - Modal này đã tích hợp sẵn: Khung giao diện nổi mờ (backdrop-blur), Thanh tìm kiếm lõi, Bảng danh sách chọn theo checkbox (Multiple/Single), và cơ chế phân trang mini nội bộ không làm ảnh hưởng URL của trang cha.

## 🎨 Nguyên tắc thiết kế UI/UX (Design Guidelines)

Để đảm bảo tính nhất quán và tối ưu hóa không gian làm việc cho toàn bộ hệ thống Admin, mọi màn hình chức năng mới **bắt buộc** tuân thủ các nguyên tắc sau:
1. **Không sử dụng Breadcrumbs**: Ẩn/bỏ các thanh điều hướng phân cấp ở đầu trang để tiết kiệm không gian theo chiều dọc.
2. **Không chứa Warning Banner mặc định**: Bỏ các khu vực cảnh báo đồng bộ dữ liệu ("Lưu ý: Sau khi cập nhật...").
3. **Tối đa hóa không gian thao tác (Full-width Layout)**:
   - **Tuyệt đối không** giới hạn chiều rộng container tổng (không dùng `max-w-[1600px]`, hãy dùng `w-full h-full`).
   - **Không** sử dụng Border (viền) hay góc bo tròn (`rounded-lg`) cho div ngoài cùng của trang.
   - Giảm tối đa padding/margin (`p-2` hoặc `p-3`) tại các layout container bên ngoài. Mục tiêu là để không gian thao tác chung mang lại cảm giác rộng rãi nhất có thể.
4. **Tích hợp Rich Text Editor (TinyMCE)**: 
   - Chỉ sử dụng component `RichTextEditor` cho các khu vực nhập liệu nội dung chính (ví dụ: "Nhập nội dung", "Bài viết"). Các trường dữ liệu phụ (như Meta Description, Keywords, Khoảng lọc giá...) chỉ sử dụng thẻ `<textarea>` thông thường.
   - **Chế độ Offline**: Khi dùng TinyMCE, phải tích hợp hoàn toàn **Offline** (lưu trữ file trực tiếp trong thư mục `public/` của dự án, không gọi qua Cloud hay CDN).
   - **Giao diện & Tính năng**: Khung soạn thảo phải tuân thủ nghiêm ngặt **Dark Theme Gaming/Tech** (sử dụng skin `oxide-dark`, nền `#0a0a0f`) và phải đảm bảo tính năng kéo/thả thay đổi kích thước (Resize) hoạt động mượt mà, không bị kẹt bởi CSS transition.

## 📂 Cấu trúc thư mục

```
admin-dashboard/
├── src/
│   ├── actions/
│   │   └── product.ts           # Server Actions query DB (Tìm kiếm SP)
│   ├── app/
│   │   ├── globals.css          # CSS hệ thống (scrollbar, glow effects)
│   │   ├── layout.tsx           # Layout cha (Sidebar + Header)
│   │   ├── page.tsx             # Trang danh sách sản phẩm (Mặc định)
│   │   └── products/            # Router quản lý danh mục / Sản phẩm / Combo
│   ├── components/
│   │   ├── layout/              # Chứa Header, Sidebar
│   │   ├── shared/              # Components xài chung (Pagination, ProductSelectModal)
│   │   └── products/            # Các table và module edit
│   └── lib/
│       ├── db.ts                # Khởi tạo MySQL Pool
│       └── menu-data.ts         # Mock data cho hệ thống Menu
```

## 🛠 Hướng dẫn khởi chạy

Cài đặt các gói thư viện cần thiết:
```bash
npm install
```

Khởi chạy môi trường phát triển (Development):
```bash
npm run dev
```

Mở trình duyệt và truy cập [http://localhost:3000](http://localhost:3000) để xem trang chủ.
Truy cập [http://localhost:3000/products/combo-set/list](http://localhost:3000/products/combo-set/list) để trải nghiệm nghiệp vụ quản lý Combo Set.

## 📝 Định hướng tiếp theo

- Hoàn thiện thêm các API cập nhật trạng thái (POST/PUT/DELETE).
- Phát triển các module quản lý Bán hàng, Khách hàng, Bảo hành,... dựa trên UI/UX tiêu chuẩn này.
