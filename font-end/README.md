# HACOM Frontend Architecture (font-end)

This directory (`D:\web-tech\font-end`) contains the customer-facing Storefront built with Next.js 15 (App Router). 

## 1. Core Principles (DO NOT VIOLATE)
1. **Headless & Decoupled:** This frontend **NEVER** connects to the MySQL database directly. There are no DB configurations or ORMs here. All data is fetched via REST API calls to the `web-admin` backend (running on `http://localhost:3000`).
2. **Aesthetics (Premium UI/UX):** The storefront strictly follows a highly premium, dark-themed aesthetic (gradients, glassmorphism, glowing cyan/blue borders) using Tailwind CSS. 
3. **No Local Images:** Product images must not be stored in `public/`. They are either fetched from the `web-admin` (which serves from `/media`) or external URLs.

## 2. Key Mechanisms

### A. Dynamic URL Routing (`app/[slug]/page.tsx`)
Instead of using IDs in the URL like `?id=123`, the app uses highly SEO-friendly slugs (e.g. `/laptop-msi-gaming-pro`).
- When a user visits a slug, the frontend fetches `GET http://localhost:3000/api/products/[slug]`.
- The backend resolves the slug from the `idv_url` database table and returns an object containing `type: 'product'` or `type: 'category'`.
- The `[slug]/page.tsx` file acts as a **Router/Gateway Component**. Based on the `type`, it either conditionally renders the `ProductPage` (Detail) or the `CategoryPage` (Listing), seamlessly maintaining the beautiful URL without redirects.

### B. Smart Pagination (`app/category/page.tsx`)
The category listing page implements a robust, E-commerce standard **Smart Pagination**:
- **API Fetching:** It sends `?page=X&limit=24` to the backend and receives `pagination: { total, page, limit, totalPages }`.
- **Ellipsis Logic:** It dynamically calculates a condensed range with ellipsis (`...`). E.g., `< | 1 | 2 | 3 | 4 | 5 | ... | 16 | >`.
- **UI:** The pagination buttons match the dark aesthetic, with the active page highlighted in vibrant Blue (`#0b63e5`) and smooth CSS transitions. When switching pages, the window automatically smooth-scrolls to the top.

### C. Dynamic Filter State Management (`app/category/page.tsx`)
- **Single Source of Truth:** All filter selections (attributes, categories, price range) must use the `useSearchParams` hook as the single source of truth. Do NOT store filter state exclusively in React `useState` without pushing it to the URL (`router.push(..., {scroll: false})`).
- **Active Filters UI:** The "Bộ lọc đã chọn" (Active Filters) array is dynamically derived by parsing the URL params against the API payload structure.
- **Vanilla JS Conflict Resolution:** When migrating legacy vanilla JS (e.g. `public/main.js`), any legacy functions that perform direct DOM manipulation on React-controlled elements (like `#active-filters-list`) MUST be disabled or commented out to prevent React Hydration / `removeChild` errors.

### C. Image Optimization (`src/components/ProgressiveImage.tsx`)
To ensure top-tier performance (Core Web Vitals) and premium UX, raw `<img />` tags are strictly forbidden for dynamic content.
- Use `<ProgressiveImage src="..." alt="..." />` instead.
- **Lazy Loading:** It uses `IntersectionObserver` to only fetch the real image when it is 50px away from the viewport.
- **Shimmer Placeholder:** While loading (or waiting to enter viewport), it displays an ultra-light Base64 SVG placeholder.
- **Graceful Degradation:** If the real image 404s, it catches the `onerror` event, aborts retrying (preventing infinite loops), and keeps the professional placeholder.

## 3. Development Workflow for AIs
If instructed to build a new UI section or page:
1. **Analyze Design Context:** Always assume a Dark Mode, premium E-commerce vibe unless told otherwise. Use deep grays/blacks (`#111115`, `#18181b`) and cyan/blue accents.
2. **Check API:** Verify if `web-admin` has the required endpoint. If not, build the API in `web-admin` first.
3. **Use Existing Components:** Utilize `ProgressiveImage` for media and follow the established Tailwind patterns found in `layout.tsx` and `page.tsx`.
