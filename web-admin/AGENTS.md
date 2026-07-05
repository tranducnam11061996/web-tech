<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Design & UI/UX Guidelines (For All Screens)

When generating or modifying functional screens (pages) in this project, **strictly adhere to the following layout rules**:
1. **No Breadcrumbs**: Do not include top breadcrumbs (e.g., `TRANG CHỦ / DANH MỤC...`) to save vertical space.
2. **No Warning Banners**: Do not include sync warnings (e.g., `"Lưu ý: Sau khi cập nhật, có thể dữ liệu sẽ được đồng bộ lên website trong khoảng 15-30 phút..."`).
3. **Maximized Workspace Layout**:
   - Do NOT use width limiters on the main page wrapper like `max-w-[1600px]`. Always use `w-full h-full` to maximize the layout.
   - Do NOT wrap the main content area in bordered panels (`border-gray-800`, `rounded-lg`). Keep the outer container borderless.
   - Keep padding and margins minimal (`p-2` or `p-3`) on the outermost containers to ensure the workspace feels as wide and spacious as possible.
4. **Rich Text Editor Integration (TinyMCE)**:
   - Only use the `RichTextEditor` component for primary content editing areas (e.g., "Nhập nội dung", main articles). Use standard `<textarea>` elements for secondary fields like SEO metadata, keywords, or simple descriptions.
   - **Offline Mode**: TinyMCE must be executed in a 100% offline mode, relying on local static assets in the `public/` directory, rather than Cloud or CDN services.
   - **Styling & Resizing**: The editor must strictly follow the "Dark Theme Gaming Tech" aesthetics (e.g. `oxide-dark` skin, neon red borders on focus). Ensure that CSS transitions on the wrapper do NOT interfere with the editor's vertical resize functionality (avoid `transition: all` on the container).

## Component Reusability Rules (CRITICAL FOR AIs)

To prevent code duplication and ensure consistency, any future development **MUST** reuse the following existing modules:

1. **Search Functionality (`src/actions/product.ts`)**:
   - Do NOT write new SQL queries for generic product searches. Use the `searchProducts()` Server Action.
   - This action is already optimized to search by `id`, `storeSKU`, and `proName`.

2. **Pagination (`src/components/shared/Pagination.tsx`)**:
   - For any list screen built with Server Components, use the `<Pagination />` component.
   - It handles URL state (`?page=`) automatically and matches the Dark Tech UI.

3. **Product Selection Modal (`src/components/shared/ProductSelectModal.tsx`)**:
   - If a new feature requires the user to "select a product" (e.g., assigning products to categories, adding to orders), **DO NOT build a new modal**.
   - Import and use `<ProductSelectModal />`. It features an internal search bar, pagination, checkbox multi-selection, and a glassmorphism design.
