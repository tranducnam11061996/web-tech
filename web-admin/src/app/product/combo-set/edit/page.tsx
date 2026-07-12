import { ComboSetEditClient } from '@/components/products/combo-set/edit/ComboSetEditClient';
import { getAdminComboSet } from '@/lib/comboSets';

async function getComboSetById(id: string) {
  try {
    const combo = await getAdminComboSet(Number(id));
    return {
      id: combo.id, title: combo.title, description: combo.description, status: combo.status,
      from_time: combo.fromTime, to_time: combo.toTime, product_count: combo.productCount,
      parsedConfig: combo.groups.map((group) => ({
        title: group.title,
        suggest_list: group.products.map((product) => ({
          title: product.title, real_id: String(product.productId), discount: String(product.discount),
          discount_type: product.discountType,
        })),
      })),
    };
  } catch (error) {
    console.error("Failed to fetch combo set:", error);
    return null;
  }
}

export default async function ComboSetEditPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const id = searchParams?.id as string;
  
  let comboSetData = null;
  
  if (id) {
    comboSetData = await getComboSetById(id);
    if (!comboSetData) {
      return <div className="p-10 text-center text-red-500 font-bold">Không tìm thấy Combo Set!</div>;
    }
  } else {
    // Default data for new Combo Set
    comboSetData = {
      id: 0,
      title: '',
      description: '',
      status: 1,
      from_time: Math.floor(Date.now() / 1000),
      to_time: Math.floor(Date.now() / 1000) + 86400 * 30, // +30 days
      product_count: 0,
      parsedConfig: []
    };
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#050505]">
      <ComboSetEditClient initialData={comboSetData} isNew={!id} />
    </div>
  );
}
