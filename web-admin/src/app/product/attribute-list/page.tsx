import { Suspense } from 'react';
import { AttributeFilter } from '@/components/attribute/AttributeFilter';
import { AttributeListTable, AttributeNode } from '@/components/attribute/AttributeListTable';
import pool from '@/lib/db';
import { buildPagination, parsePaginationParams } from '@/lib/admin/pagination';

async function getAttributes(page: number, limit: number) {
  try {
    const offset = (page - 1) * limit;

    // Count attributes
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM idv_attribute'
    );
    const totalItems = Number((countResult as any[])[0]?.total || 0);

    // Fetch attributes
    const [rows] = await pool.query(`
      SELECT 
        id, attribute_code, name, value_count, status
      FROM idv_attribute 
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `, [Number(limit), Number(offset)]);

    const attributes: AttributeNode[] = (rows as any[]).map((row: any, index: number) => ({
      id: row.id,
      sequence: offset + index + 1,
      code: row.attribute_code || `ATTR_${row.id}`,
      name: row.name || 'N/A',
      valueCount: row.value_count || 0,
      categoryCount: 1, // Simplified as per design "1 danh mục"
      isActive: row.status === 1,
    }));

    return {
      attributes,
      pagination: buildPagination(totalItems, page, limit),
    };
  } catch (error) {
    console.error("Failed to fetch attributes:", error);
    return {
      attributes: [],
      pagination: buildPagination(0, 1, limit),
    };
  }
}

export default async function AttributeListPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const { page, limit } = parsePaginationParams(searchParams);

  const { attributes, pagination } = await getAttributes(page, limit);

  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      <div className="flex flex-col flex-1 h-full min-h-0">
        <Suspense fallback={<div className="h-14 bg-gray-900/50 animate-pulse rounded-lg mb-4"></div>}>
          <AttributeFilter />
        </Suspense>
        
        <div className="flex-1 min-h-0">
          <Suspense fallback={<div className="h-full bg-gray-900/50 animate-pulse rounded-lg"></div>}>
            <AttributeListTable attributes={attributes} pagination={pagination} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
