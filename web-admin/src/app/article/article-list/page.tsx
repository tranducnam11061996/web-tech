import { ArticleListFilter } from '@/components/article-list/ArticleListFilter';
import { ArticleListTable } from '@/components/article-list/ArticleListTable';

export default function ArticleListPage() {
  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-h-0">
        <ArticleListFilter />
        
        <div className="flex-1 min-h-0 mt-2">
          <ArticleListTable />
        </div>
      </div>
    </div>
  );
}
