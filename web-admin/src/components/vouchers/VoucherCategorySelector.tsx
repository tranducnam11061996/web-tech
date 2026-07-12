'use client';

import { CategoryScopeSelector, type CategoryScopeItem } from '@/components/shared/CategoryScopeSelector';

export type VoucherCategory = CategoryScopeItem;

export function VoucherCategorySelector({ categories, selectedIds, onChange }: {
  categories: VoucherCategory[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  return <CategoryScopeSelector
    categories={categories}
    selectedIds={selectedIds}
    onChange={onChange}
    selectedTitle="Danh mục voucher đã chọn"
    treeTitle="Chọn danh mục áp dụng voucher"
    emptyText="Voucher áp dụng cho toàn bộ sản phẩm."
  />;
}
