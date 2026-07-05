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

### D. Image Optimization (`src/components/ProgressiveImage.tsx`)
To ensure top-tier performance (Core Web Vitals) and premium UX, raw `<img />` tags are strictly forbidden for dynamic content.
- Use `<ProgressiveImage src="..." alt="..." />` instead.
- **Lazy Loading:** It uses `IntersectionObserver` to only fetch the real image when it is 50px away from the viewport.
- **Shimmer Placeholder:** While loading (or waiting to enter viewport), it displays an ultra-light Base64 SVG placeholder.
- **Graceful Degradation:** If the real image 404s, it catches the `onerror` event, aborts retrying (preventing infinite loops), and keeps the professional placeholder.

### E. Advanced Micro-Interactions & Performance
To maintain the "Premium" feel, the application uses highly optimized custom interactions:
- **Smart Sticky Header (`src/components/Header.tsx`):** Detects scroll direction. The top search bar is permanently sticky (`z-[100]`). The bottom navigation menu (`z-[90]`) smoothly hides (`-translate-y-full`) beneath the search bar on scroll down, and reveals on scroll up. **Performance rule:** Scroll tracking uses `useRef` to track `window.scrollY` (preventing massive React re-renders) and a `resize` listener to compute sticky offset dynamically.
- **Fluid Carousels (`src/components/ProductCarousel.tsx`):** Implements `Swiper` for infinite looping (`loop={true}`). Avoid wrapping Swiper instances in restrictive CSS size containers that cause jitter during loop transitions.
- **Strict Route Sanitization:** Sub-category links automatically strip leading slashes (e.g. using `replace(/^\/+/, '')`) to prevent Next.js from mistaking them for Protocol-Relative URLs.

### F. News System & Server Components (`app/tin-tuc/[slug]/page.tsx`)
- **Server-Side Rendering (RSC):** For content-heavy pages like News Articles and Categories, we **strictly** use React Server Components (no `"use client"`). This enables 0 JavaScript payload for fetching, lightning-fast LCP, and seamless SEO.
- **Dynamic Metadata (`generateMetadata`):** Metadata (title, descriptions, keywords, OpenGraph images) is dynamically generated server-side using the `generateMetadata` Next.js API, fetching data before the page renders.
- **ISR Caching:** Fetch calls to the backend include `{ next: { revalidate: 60 } }` to leverage Next.js Incremental Static Regeneration, drastically reducing the load on the backend MySQL database.
- **Fallback Gateway:** The `/tin-tuc/[slug]` route acts as a dual gateway. It first attempts to fetch an article (`/api/news/[slug]`). If that returns a 404, it intelligently falls back to fetching a category (`/api/news-category/[slug]`), and renders the appropriate layout.
- **Raw CMS HTML Formatting:** When rendering database-stored HTML (like CKEditor content), we do NOT use Tailwind's `@tailwindcss/typography` (`prose`) plugin as it overwrites inline styles. Instead, we use **Tailwind Arbitrary Variants** (e.g. `className="[&_h1]:text-white [&_p]:mb-4"`) combined with `dangerouslySetInnerHTML`. We also use regex to dynamically rewrite relative image paths (`../media/news/`) to absolute server URLs (`https://hacom.vn/media/`).

## 3. Development Workflow for AIs
If instructed to build a new UI section or page:
1. **Analyze Design Context:** Always assume a Dark Mode, premium E-commerce vibe unless told otherwise. Use deep grays/blacks (`#111115`, `#18181b`) and cyan/blue accents.
2. **Determine Architecture (Client vs Server):** Default to Server Components (`async function Page()`) for SEO/Performance. Only use `"use client"` when you absolutely need React hooks (`useState`, `useEffect`, `useRouter`, or interactive DOM events).
3. **Check API:** Verify if `web-admin` has the required endpoint. If not, build the API in `web-admin` first.
4. **Use Existing Components:** Utilize `ProgressiveImage` for media and follow the established Tailwind patterns found in `layout.tsx` and `page.tsx`.
