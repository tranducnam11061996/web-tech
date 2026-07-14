import { AttributeEditTabs } from '@/components/attribute/edit/AttributeEditTabs';
import { getAttribute, listAttributeCategories } from '@/lib/admin/attributes';
import type { AttributeFormData } from '@/lib/admin/attributeTypes';

const EMPTY_ATTRIBUTE: AttributeFormData = {
  name: '', code: '', comment: '', filterCode: '', scope: 0, ordering: 0,
  isHeader: false, isSearch: true, inSummary: false, productSpec: false,
  forProductOption: false, status: true, values: [], categoryIds: [],
};

export default async function AttributeEditPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const rawId = Array.isArray(searchParams?.id) ? searchParams?.id[0] : searchParams?.id;
  const attributeId = Number(rawId || 0);
  const [categories, attributeResult] = await Promise.all([
    listAttributeCategories(),
    attributeId ? getAttribute(attributeId).then((data) => ({ data, error: '' })).catch((error) => ({ data: null, error: error instanceof Error ? error.message : 'Không thể tải thuộc tính' })) : Promise.resolve({ data: EMPTY_ATTRIBUTE, error: '' }),
  ]);

  if (!attributeResult.data) {
    return <div className="p-10 text-center text-red-500 font-bold">{attributeResult.error}</div>;
  }

  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      <div className="flex flex-col flex-1 h-full min-h-0 bg-gray-950/30 rounded-lg border border-gray-800/60 shadow-xl overflow-hidden backdrop-blur-xl">
        <AttributeEditTabs initialData={attributeResult.data} categories={categories} />
      </div>
    </div>
  );
}
