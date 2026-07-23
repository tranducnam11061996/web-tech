import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { ComboSetScopeManager } from '@/components/products/combo-set/ComboSetScopeManager';
import { parsePaginationParams } from '@/lib/admin/pagination';
import { getAdminComboSetScope } from '@/lib/comboSetScopes';

export default async function ComboSetProductPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const comboId = Number(searchParams?.id);
  const { page, limit } = parsePaginationParams(searchParams);

  if (!Number.isInteger(comboId) || comboId <= 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#0a0a0f] p-6 font-mono text-gray-500">
        <h1>ID Combo Set không hợp lệ.</h1>
        <Link href="/product/combo-set/list" className="mt-4 text-blue-500 hover:underline focus-visible:outline-2 focus-visible:outline-blue-400">Quay lại danh sách</Link>
      </div>
    );
  }

  const scope = await getAdminComboSetScope(comboId, page, limit);
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#0a0a0f]">
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-red-600/5 blur-[150px]" />

      <div className="relative z-10 flex h-full flex-col space-y-6 p-4 md:p-6">
        <header className="flex flex-col justify-between gap-4 rounded-lg border border-gray-800 bg-gray-900/50 p-5 shadow-xl backdrop-blur-sm md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <Link href="/product/combo-set/list" aria-label="Quay lại danh sách Combo Set" className="rounded bg-gray-800 p-2 text-gray-400 shadow-sm hover:bg-gray-700 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400">
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-xl font-black uppercase tracking-wider text-transparent drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] md:text-2xl">
                Các sản phẩm được áp dụng combo
              </h1>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-400">
                Combo Set: <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-bold text-white">{scope.combo.title}</span>
              </p>
            </div>
          </div>
        </header>

        <div className="min-h-[400px] flex-1 overflow-hidden">
          <ComboSetScopeManager
            comboSetId={comboId}
            products={scope.products}
            pagination={scope.pagination}
            directProductIds={scope.directProductIds}
            selectedCategoryIds={scope.selectedCategories.map((category) => category.id)}
            categories={scope.categories}
            brands={scope.brands}
            effectiveProductCount={scope.effectiveProductCount}
          />
        </div>
      </div>
    </div>
  );
}
