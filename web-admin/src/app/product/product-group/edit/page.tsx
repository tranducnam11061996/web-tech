import { ProductGroupEditor } from '@/components/product-group/ProductGroupEditor';

export default async function ProductGroupEditPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const params = await searchParams;
  const id = Number(params.id || 0);
  return <ProductGroupEditor groupId={Number.isInteger(id) && id > 0 ? id : undefined} />;
}
