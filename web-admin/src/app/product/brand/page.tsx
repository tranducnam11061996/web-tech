import { BrandFilter } from '@/components/brand/BrandFilter';
import { BrandTable } from '@/components/brand/BrandTable';
import pool from '@/lib/db';
import { buildPagination, parsePaginationParams } from '@/lib/admin/pagination';
import { brandDescriptionPreview } from '@/lib/admin/brands';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function BrandPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const { page, limit, offset } = parsePaginationParams(searchParams);

  const [listQueryResult, countQueryResult] = await Promise.all([
    pool.query(
      `SELECT b.id, b.name, b.image, b.summary, b.product, b.ordering, b.status, b.is_featured,
              LEFT((
                SELECT i.description
                FROM idv_brand_info i
                WHERE i.id = b.id AND i.sellerId = 0
                LIMIT 1
              ), 600) AS description_preview
       FROM idv_brand b
       ORDER BY b.ordering ASC, b.id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    ),
    pool.query('SELECT COUNT(*) as total FROM idv_brand'),
  ]);
  const rows = listQueryResult[0] as any[];
  const countRows = countQueryResult[0] as any[];
  const totalItems = Number(countRows[0]?.total || 0);

  // Map to BrandNode format
  const brands = rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    logo: row.image && row.image !== '0' ? row.image : null,
    message: row.summary,
    productCount: row.product || 0,
    description: brandDescriptionPreview(row.description_preview),
    displayOrder: row.ordering,
    status: (row.status === 1 ? 'Hoạt động' : 'Tạm khóa') as 'Hoạt động' | 'Tạm khóa',
    featured: row.is_featured === 1
  }));

  const pagination = buildPagination(totalItems, page, limit);

  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-h-0">
        <BrandFilter />
        
        <div className="flex-1 min-h-0 mt-2">
          <BrandTable brands={brands} pagination={pagination} />
        </div>
      </div>
    </div>
  );
}
