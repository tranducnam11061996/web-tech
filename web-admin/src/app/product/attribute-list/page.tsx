import { AttributeManager } from '@/components/attribute/AttributeManager';
import { listAttributes } from '@/lib/admin/attributes';
import { buildPagination, parsePaginationParams } from '@/lib/admin/pagination';

export default async function AttributeListPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const { page, limit } = parsePaginationParams(searchParams);
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const q = String(first(searchParams?.q) || '').trim();
  const sort = String(first(searchParams?.sort) || 'id');
  const direction = String(first(searchParams?.direction) || 'desc');
  const result = await listAttributes({ page, limit, q, sort, direction });

  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      <div className="flex flex-col flex-1 h-full min-h-0">
        <AttributeManager
          attributes={result.items}
          pagination={buildPagination(result.totalItems, result.page, result.limit)}
          initialQuery={q}
        />
      </div>
    </div>
  );
}
