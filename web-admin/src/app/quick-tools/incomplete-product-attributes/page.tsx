import { Suspense } from 'react';
import { IncompleteProductAttributesClient } from '@/components/quick-tools/IncompleteProductAttributesClient';

export const dynamic = 'force-dynamic';

export default function IncompleteProductAttributesPage() {
  return (
    <Suspense fallback={<div className="min-h-96 animate-pulse rounded-2xl border border-gray-800 bg-gray-950/60" />}>
      <IncompleteProductAttributesClient />
    </Suspense>
  );
}
