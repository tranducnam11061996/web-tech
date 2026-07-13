export default function CatalogNotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0c] px-6 text-white">
      <div className="max-w-lg text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">404</p>
        <h1 className="mb-3 text-3xl font-bold">Danh mục không tồn tại</h1>
        <p className="text-gray-400">Danh mục này đang tắt hoặc không còn được phục vụ.</p>
      </div>
    </main>
  );
}
