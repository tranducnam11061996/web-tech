import { ProductPromotionManager } from '@/components/product-promotions/ProductPromotionManager';

export default async function ProductPromotionEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const promotionId = Number(id);
  return <div className="h-full w-full p-2"><ProductPromotionManager editPromotionId={Number.isInteger(promotionId) && promotionId > 0 ? promotionId : undefined} standalone /></div>;
}
