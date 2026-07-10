import { Suspense } from 'react';
import CollectionEditClient from './CollectionEditClient';

export default function CollectionEditPage() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-400">Đang tải bộ sưu tập...</div>}>
      <CollectionEditClient />
    </Suspense>
  );
}
