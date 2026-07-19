import Link from 'next/link';
import { ArrowRight, BadgeCheck, FolderInput, PackageCheck, Wrench } from 'lucide-react';

const tools = [
  {
    title: 'Thao tác cho hàng loạt sản phẩm',
    description: 'Xóa, ẩn/hiện hoặc đổi danh mục cho một danh sách sản phẩm.',
    icon: PackageCheck,
    enabled: false,
  },
  {
    title: 'Chuyển sản phẩm giữa các danh mục',
    description: 'Chuyển toàn bộ hoặc một nhóm SKU từ danh mục A sang danh mục B.',
    icon: FolderInput,
    enabled: false,
  },
  {
    title: 'Cập nhật sản phẩm chưa đủ thuộc tính',
    description: 'Lọc SKU còn thiếu và gán nhanh nhiều giá trị thuộc tính bằng autosave.',
    icon: BadgeCheck,
    enabled: true,
    href: '/quick-tools/incomplete-product-attributes',
  },
];

export default function QuickToolsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-10">
      <header className="rounded-2xl border border-gray-800/80 bg-gray-950/65 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <span className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-red-400">
            <Wrench className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">Web Admin</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Công cụ nhanh</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              Các thao tác catalog có phạm vi lớn. Hãy kiểm tra đúng danh mục và dữ liệu trước khi thực hiện.
            </p>
          </div>
        </div>
      </header>

      <section aria-label="Danh sách công cụ" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          const content = (
            <>
              <div className="flex items-start justify-between gap-4">
                <span className={`rounded-lg border p-2.5 ${tool.enabled ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-gray-800 bg-gray-900 text-gray-500'}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tool.enabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 bg-gray-900 text-gray-500'}`}>
                  {tool.enabled ? 'Sẵn sàng' : 'Chưa triển khai'}
                </span>
              </div>
              <p className="mt-6 text-xs font-medium text-gray-600">0{index + 1}</p>
              <h2 className="mt-2 text-base font-semibold text-gray-100">{tool.title}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-gray-500">{tool.description}</p>
              <span className={`mt-6 inline-flex items-center gap-2 text-sm font-medium ${tool.enabled ? 'text-blue-300' : 'text-gray-600'}`}>
                {tool.enabled ? 'Mở công cụ' : 'Không khả dụng'}
                {tool.enabled && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </span>
            </>
          );
          return tool.enabled && tool.href ? (
            <Link key={tool.title} href={tool.href} className="group rounded-2xl border border-gray-800/80 bg-gray-950/60 p-5 transition hover:border-blue-500/40 hover:bg-gray-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
              {content}
            </Link>
          ) : (
            <article key={tool.title} aria-disabled="true" className="rounded-2xl border border-gray-900 bg-gray-950/35 p-5 opacity-80">
              {content}
            </article>
          );
        })}
      </section>
    </div>
  );
}
