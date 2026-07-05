import { CollectionProductFilter } from '@/components/collection-product/CollectionProductFilter';
import { CollectionProductTable } from '@/components/collection-product/CollectionProductTable';

export default function CollectionProductPage() {
  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-h-0">
        <CollectionProductFilter />
        
        <div className="flex-1 min-h-0 mt-2">
          <CollectionProductTable />
        </div>
      </div>
    </div>
  );
}
