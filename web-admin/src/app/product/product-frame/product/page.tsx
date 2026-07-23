import { notFound } from 'next/navigation';
import { ProductFrameProductFilter } from '@/components/product-frame-product/ProductFrameProductFilter';
import { ProductFrameProductTable } from '@/components/product-frame-product/ProductFrameProductTable';

export default function ProductFrameProductPage() {
  notFound();

  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-h-0">
        <ProductFrameProductFilter />
        
        <div className="flex-1 min-h-0 mt-2">
          <ProductFrameProductTable />
        </div>
      </div>
    </div>
  );
}
