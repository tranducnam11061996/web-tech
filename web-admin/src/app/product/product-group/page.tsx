'use client';

import { ProductGroupFilter } from '@/components/product-group/ProductGroupFilter';
import { ProductGroupTable } from '@/components/product-group/ProductGroupTable';
import { useState } from 'react';

export default function ProductGroupPage() {
  const [search, setSearch] = useState('');
  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-h-0">
        <ProductGroupFilter search={search} onSearchChange={setSearch} />
        
        <div className="flex-1 min-h-0 mt-2">
          <ProductGroupTable search={search} />
        </div>
      </div>
    </div>
  );
}
