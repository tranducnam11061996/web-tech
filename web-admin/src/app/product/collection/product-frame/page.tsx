import { ProductFrameFilter } from '@/components/product-frame/ProductFrameFilter';
import { ProductFrameTable } from '@/components/product-frame/ProductFrameTable';

export default function ProductFramePage() {
  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-h-0">
        <ProductFrameFilter />
        
        <div className="flex-1 min-h-0 mt-2">
          <ProductFrameTable />
        </div>
      </div>
    </div>
  );
}
