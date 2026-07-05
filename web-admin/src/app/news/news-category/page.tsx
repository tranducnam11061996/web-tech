import { ArticleCategoryFilter } from '@/components/article-category/ArticleCategoryFilter';
import { ArticleCategoryTable } from '@/components/article-category/ArticleCategoryTable';
import pool from '@/lib/db';

export const revalidate = 0; // Disable static rendering since it fetches from DB

export default async function ArticleCategoryPage() {
  let categories: any[] = [];
  
  try {
    const [rows] = await pool.query('SELECT * FROM idv_seller_news_category ORDER BY parentId ASC, ordering DESC, id ASC');
    
    const categoryMap: any = {};
    const roots: any[] = [];
    
    (rows as any[]).forEach(row => {
      categoryMap[row.id] = { ...row, children: [] };
    });
    
    (rows as any[]).forEach(row => {
      if (row.parentId === 0) {
        roots.push(categoryMap[row.id]);
      } else {
        if (categoryMap[row.parentId]) {
          categoryMap[row.parentId].children.push(categoryMap[row.id]);
        }
      }
    });

    const mapNode = (node: any, prefix: string = '', index: number): any => {
      const stt = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      let displayTypeStr = 'Không xác định';
      if (node.display_option === 'article') displayTypeStr = 'Chỉ hiển thị bài';
      if (node.display_option === 'child_article') displayTypeStr = 'Hiển thị bài + Danh mục con';

      return {
        id: node.id.toString(),
        stt,
        name: node.name,
        articleCount: node.item_count || 0,
        displayType: displayTypeStr,
        url: node.url,
        order: node.ordering || 0,
        isActive: node.status === 1,
        children: node.children.map((child: any, i: number) => mapNode(child, stt, i))
      };
    };

    categories = roots.map((root, i) => mapNode(root, '', i));
  } catch (err) {
    console.error("Failed to fetch article categories:", err);
  }

  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-h-0">
        <ArticleCategoryFilter />
        
        <div className="flex-1 min-h-0 mt-2">
          <ArticleCategoryTable initialData={categories} />
        </div>
      </div>
    </div>
  );
}
