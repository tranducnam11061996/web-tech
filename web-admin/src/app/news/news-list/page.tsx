import { ArticleListFilter } from '@/components/article-list/ArticleListFilter';
import { ArticleListTable } from '@/components/article-list/ArticleListTable';
import pool from '@/lib/db';
import { parsePaginationParams } from '@/lib/admin/pagination';
import { resolveNewsImageUrl } from '@/lib/newsImageUrl';

export const revalidate = 0;
const storefrontUrl = process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3001';

export default async function ArticleListPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  let articles: any[] = [];
  let totalArticles = 0;
  
  // Use await for searchParams properties in Next.js 15+ if needed, but in standard usage:
  // Assuming standard Next.js 14 behavior, searchParams is an object.
  // Wait, Next.js 15 requires awaiting searchParams! Let's handle both.
  const resolvedParams = await searchParams;
  const { page, limit, offset } = parsePaginationParams(resolvedParams);

  try {
    const [countQueryResult, listQueryResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM idv_seller_news'),
      pool.query(`
        SELECT 
          id, title, request_path, url, createDate, createBy, 
          visit, lastUpdate, lastUpdateByUser, status, thumnail
        FROM idv_seller_news 
        ORDER BY createDate DESC 
        LIMIT ? OFFSET ?
      `, [limit, offset]),
    ]);
    totalArticles = Number((countQueryResult[0] as any[])[0]?.total || 0);
    const rows = listQueryResult[0] as any[];

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    };

    articles = (rows as any[]).map(row => ({
      id: row.id.toString(),
      thumbnail: resolveNewsImageUrl(row.thumnail),
      title: row.title,
      url: `${storefrontUrl}/tin-tuc/${row.url}`,
      publishDate: formatDate(row.createDate),
      author: `ID: ${row.createBy}`,
      views: row.visit || 0,
      updatedAt: formatDate(row.lastUpdate),
      updater: row.lastUpdateByUser || '',
      status: row.status === 1 ? 'Hoạt động' : 'Tạm khóa'
    }));
  } catch (err) {
    console.error("Failed to fetch articles:", err);
  }

  const totalPages = Math.max(1, Math.ceil(totalArticles / limit));

  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-h-0">
        <ArticleListFilter />
        
        <div className="flex-1 min-h-0 mt-2">
          <ArticleListTable 
            initialData={articles} 
            currentPage={page} 
            totalPages={totalPages} 
            totalItems={totalArticles}
            limit={limit}
          />
        </div>
      </div>
    </div>
  );
}
