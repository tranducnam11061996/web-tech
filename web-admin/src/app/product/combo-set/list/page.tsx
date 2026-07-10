import pool from '@/lib/db';
import { ComboSetFilter } from '@/components/products/combo-set/ComboSetFilter';
import { ComboSetTable } from '@/components/products/combo-set/ComboSetTable';
import { buildPagination, parsePaginationParams } from '@/lib/admin/pagination';

async function getComboSets(page: number, limit: number, search: string, status: string) {
  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (search) {
      whereClause += ' AND cs.title LIKE ?';
      params.push(`%${search}%`);
    }
    
    if (status && status !== 'all') {
      whereClause += ' AND cs.status = ?';
      params.push(status === 'active' ? 1 : 0);
    }
    
    const offset = (page - 1) * limit;
    
    // Count total rows
    const countQuery = `
      SELECT COUNT(cs.id) as total 
      FROM combo_set cs
      ${whereClause}
    `;
    const [countRows] = await pool.query(countQuery, params);
    const total = (countRows as any[])[0]?.total || 0;
    
    // Fetch data
    const query = `
      SELECT 
        cs.id, cs.title, cs.status, cs.product_count, cs.from_time, cs.to_time
      FROM combo_set cs
      ${whereClause}
      ORDER BY cs.id DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(Number(limit), Number(offset));
    
    const [rows] = await pool.query(query, params);
    
    return {
      data: rows as any[],
      pagination: buildPagination(Number(total || 0), page, limit),
    };
  } catch (error) {
    console.error("Failed to fetch combo sets:", error);
    return { data: [], pagination: buildPagination(0, 1, limit) };
  }
}

export default async function ComboSetListPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const { page, limit } = parsePaginationParams(searchParams);
  const search = (searchParams?.search as string) || '';
  const status = (searchParams?.status as string) || 'all';

  const { data, pagination } = await getComboSets(page, limit, search, status);

  return (
    <div className="flex flex-col h-full w-full p-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wider flex items-center gap-3">
          <span className="w-2 h-8 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></span>
          QUẢN LÝ COMBO SET
        </h1>
      </div>

      <div className="flex flex-col flex-1 min-h-0 bg-gray-950/30 rounded-lg border border-gray-800/60 shadow-xl overflow-hidden backdrop-blur-xl">
        <ComboSetFilter initialSearch={search} initialStatus={status} />
        
        <div className="flex-1 overflow-auto custom-scrollbar p-4">
          <ComboSetTable combos={data} pagination={pagination} />
        </div>
      </div>
    </div>
  );
}
