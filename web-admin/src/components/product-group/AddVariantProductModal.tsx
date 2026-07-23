'use client';

import {
  CatalogProductPickerModal,
  type CatalogProductChoice,
} from '@/components/shared/CatalogProductPickerModal';
import type { ProductCatalogChoice } from './types';

export function AddVariantProductModal({
  isOpen,
  onClose,
  groupId,
  selectedProductIds,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  groupId?: number;
  selectedProductIds: number[];
  onSelect: (product: ProductCatalogChoice) => void;
}) {
  return (
    <CatalogProductPickerModal
      isOpen={isOpen}
      onClose={onClose}
      selectedProductIds={selectedProductIds}
      onSelect={(product: CatalogProductChoice) => onSelect(product)}
      title="Chọn SKU cho group"
      description="Chỉ hiển thị SKU chưa thuộc group khác."
      emptyText="Không có SKU khả dụng."
      queryParams={{ assignment: 'available', groupId }}
    />
  );
}
