import { ProductGroupFilter } from '@/components/product-group/ProductGroupFilter';
import { ProductGroupTable } from '@/components/product-group/ProductGroupTable';

export default function ProductGroupPage() {
  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-h-0">
        <ProductGroupFilter />
        
        <div className="flex-1 min-h-0 mt-2">
          <ProductGroupTable />
        </div>
      </div>
    </div>
  );
}
