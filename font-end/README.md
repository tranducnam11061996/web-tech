# HACOM Storefront (`font-end`)

Storefront khách hàng chạy bằng Next.js 15 App Router tại cổng `3001`.

## Nguyên tắc bắt buộc

- Không kết nối trực tiếp MySQL.
- Mọi dữ liệu động đi qua API `web-admin` tại cổng `3000`.
- Không thay đổi UI/class/layout khi task chỉ yêu cầu tối ưu logic hoặc hiệu suất.
- Trang nội dung ưu tiên Server Component; chỉ tách Client Component cho tương tác.
- Không gọi các hàm global từ `public/main.js`; menu/filter dùng React state.
- Dùng `ProgressiveImage` cho ảnh động cần placeholder/lazy loading.

## Routes chính

| Route | Component | Ghi chú |
|---|---|---|
| `/` | `app/page.tsx` | Static home shell |
| `/[slug]` | `app/[slug]/page.tsx` | Server gateway cho product/category |
| `/category` | `app/category/page.tsx` | Category theo query id |
| `/gio-hang` | `CartClient` | Guest cart từ localStorage |
| `/thanh-toan` | `CheckoutClient` | Quote selected items và tạo order |
| `/tin-tuc` | `app/tin-tuc/page.tsx` | News landing |
| `/tin-tuc/[slug]` | Server route | Article/category news |

## Dynamic slug gateway

`app/[slug]/page.tsx` gọi:

```text
GET http://localhost:3000/api/products/{slug}
```

Nếu response là category, server fetch song song:

- `/api/products?category_id=...`
- `/api/categories?parentId=...`
- `/api/categories/price-bounds?categoryId=...`
- `/api/categories/attributes?categoryId=...`

Sau hydration, `CategoryClient` chỉ fetch lại product list khi page/filter/sort thay đổi. Metadata category chỉ fetch lại khi category id đổi.

## Category filter

- URL search params là source of truth cho attribute, brand, price và sort.
- Active filters được derive bằng `Map`, không setState trong render.
- Request cũ được hủy bằng `AbortController`.
- Attribute value chứa URL/script legacy bị ẩn phòng thủ ở frontend; backend cũng làm sạch response.
- Pagination hiện được giữ trong React state, mỗi trang `24` sản phẩm.

## Cart

Storage key:

```text
hacom.cart.v1
```

Cart hỗ trợ:

- Merge item trùng `productId`.
- Quantity `1..99` ở client.
- Selected item, select all, remove selected.
- Saved for later.
- Header badge theo tổng quantity active.
- Reload vẫn giữ dữ liệu.

Giá localStorage không phải nguồn tin cậy. Cart và checkout gọi `POST /api/cart/quote`; order API re-quote thêm lần nữa.

## Components hiệu suất

### `ProgressiveImage`

- Cache SVG placeholder theo fallback text.
- `IntersectionObserver` với root margin `50px`.
- Native `loading="lazy"`.
- Giữ placeholder nếu ảnh lỗi.

### `ProductCarousel`

- Custom React carousel, không dùng Swiper.
- Memoize `images` và cloned images.
- Drag delta lưu trong ref để tránh render từng pixel.
- Auto timer dừng khi tab ẩn và cleanup khi unmount.

### `Header`

- Menu data ở `src/components/menuData.ts`.
- Mega menu desktop/mobile render bằng React.
- Click-outside và body class được cleanup.
- Không phụ thuộc global script.

## Biến môi trường

```env
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

Next config hiện vẫn có rewrite `/api/:path*` sang backend local để client gọi cùng origin.

## Commands

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

## Kiểm thử tối thiểu

- `/laptop`: load, filter, sort, pagination, quick filter search.
- Product detail: quantity, add cart, buy online.
- Cart: select, quantity, saved for later, delete, quote.
- Checkout: selected items, invalid item, submit validation.
- Header: badge, desktop menu, mobile menu.
- Build production trước khi bàn giao.

Xem trạng thái và test gap tại `../PROJECT_PROGRESS.md`.

