import { CollectionFilter } from '@/components/collections/CollectionFilter';
import { CollectionTable } from '@/components/collections/CollectionTable';

export default function CollectionPage() {
  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-h-0">
        <CollectionFilter />
        
        <div className="flex-1 min-h-0 mt-2">
          <CollectionTable />
        </div>
      </div>
    </div>
  );
}
