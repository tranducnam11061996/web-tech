import { BrandFilter } from '@/components/brand/BrandFilter';
import { BrandTable } from '@/components/brand/BrandTable';
import pool from '@/lib/db';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function BrandPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const limit = Number(searchParams.limit) || 20;
  const offset = (page - 1) * limit;

  // Fetch data
  const [rows] = await pool.query(
    'SELECT * FROM idv_brand ORDER BY ordering ASC, id DESC LIMIT ? OFFSET ?',
    [limit, offset]
  ) as any;

  // Fetch count
  const [countRows] = await pool.query('SELECT COUNT(*) as total FROM idv_brand') as any;
  const totalItems = countRows[0].total;
  const totalPages = Math.ceil(totalItems / limit);

  // Map to BrandNode format
  const brands = rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    logo: row.image && row.image !== '0' ? row.image : null,
    message: row.summary,
    productCount: row.product || 0,
    description: row.summary,
    displayOrder: row.ordering,
    status: row.status === 1 ? 'Hoạt động' : 'Tạm khóa',
    featured: row.is_featured === 1
  }));

  const pagination = {
    currentPage: page,
    totalPages,
    totalItems,
    pageSize: limit
  };

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
