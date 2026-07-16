import Link from 'next/link';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProgressiveImage from '../../../components/ProgressiveImage';
import CategorySidebar from '../../../components/CategorySidebar';
import { formatNewsDate, newsPlainText, type NewsCategory, type NewsItem } from '../../../lib/news';
import { NewsCategoryShareControls } from './NewsCategoryControls';

type Category = {
  id: number;
  name: string;
  url: string;
  summary?: string;
  description?: string;
  categoryTrail?: Array<{ id: number; name: string; slug: string }>;
};

type Sort = 'latest' | 'popular';

const cardGradients = [
  'bg-gradient-to-br from-purple-900 to-indigo-900',
  'bg-gradient-to-br from-teal-900 to-teal-800',
  'bg-gradient-to-br from-gray-700 to-gray-800',
  'bg-gradient-to-br from-yellow-900 to-orange-800',
  'bg-gradient-to-br from-blue-900 to-blue-800',
  'bg-gradient-to-br from-green-900 to-green-800',
];

function categoryHref(slug: string, page: number, sort: Sort) {
  const params = new URLSearchParams();
  if (sort === 'popular') params.set('sort', 'popular');
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return `/tin-tuc/${slug}${query ? `?${query}` : ''}`;
}

function paginationItems(page: number, totalPages: number): Array<number | 'ellipsis-left' | 'ellipsis-right'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const values = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = Array.from(values).filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  const result: Array<number | 'ellipsis-left' | 'ellipsis-right'> = [];
  pages.forEach((value, index) => {
    const previous = pages[index - 1];
    if (previous && value - previous > 1) result.push(previous === 1 ? 'ellipsis-left' : 'ellipsis-right');
    result.push(value);
  });
  return result;
}

function AuthorIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
  );
}

function NewsImage({ article, className }: { article: NewsItem; className: string }) {
  if (!article.thumnail) return null;
  return <ProgressiveImage src={article.thumnail} alt={article.title} fallbackText="" className={className} />;
}

function HeroNews({ articles, categoryName }: { articles: NewsItem[]; categoryName: string }) {
  const [primary, secondary, tertiary] = articles;
  if (!primary) return null;

  return (
    <div data-news-bento className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-auto lg:h-[450px]">
      <Link data-news-hero href={`/tin-tuc/${primary.url}`} className="lg:col-span-2 relative overflow-hidden rounded-[16px] group cursor-pointer min-h-[300px] lg:min-h-0 h-full border border-[#1a1a1e] hover:border-blue-500/50 transition-colors">
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 bg-gradient-to-br from-blue-900 to-indigo-900">
          <NewsImage article={primary} className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/60 to-transparent flex flex-col justify-end p-6 md:p-8">
          <span className="bg-blue-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full uppercase w-fit mb-4 shadow-[0_0_15px_rgba(37,99,235,0.5)] tracking-wide">{categoryName}</span>
          <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-3 group-hover:text-blue-400 transition-colors">{primary.title}</h2>
          <p className="text-gray-300 text-sm line-clamp-2 mb-4 hidden md:block">{newsPlainText(primary.summary)}</p>
          <div className="flex items-center gap-4 text-[12px] text-gray-400">
            <span className="flex items-center gap-1.5"><AuthorIcon className="w-3.5 h-3.5 text-blue-500" /><span className="font-bold text-gray-200">PCM</span></span>
            <span className="flex items-center gap-1.5">
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              {formatNewsDate(primary.createDate)}
            </span>
          </div>
        </div>
      </Link>

      {secondary && (
        <Link data-news-hero href={`/tin-tuc/${secondary.url}`} className="lg:col-span-1 relative overflow-hidden rounded-[16px] group cursor-pointer min-h-[250px] lg:min-h-0 h-full border border-[#1a1a1e] hover:border-red-500/50 transition-colors">
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 bg-gradient-to-br from-red-900 to-orange-900"><NewsImage article={secondary} className="h-full w-full object-cover" /></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/50 to-transparent flex flex-col justify-end p-6">
            <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase w-fit mb-3">{secondary.category_name || categoryName}</span>
            <h3 className="text-lg font-bold text-white leading-snug mb-3 group-hover:text-red-400 transition-colors">{secondary.title}</h3>
            <div className="flex items-center gap-3 text-[11px] text-gray-400"><span className="flex items-center gap-1"><AuthorIcon className="w-3 h-3 text-red-500" />PCM</span></div>
          </div>
        </Link>
      )}

      {tertiary && (
        <Link data-news-hero href={`/tin-tuc/${tertiary.url}`} className="lg:col-span-1 relative overflow-hidden rounded-[16px] group cursor-pointer min-h-[250px] lg:min-h-0 h-full border border-[#1a1a1e] hover:border-green-500/50 transition-colors">
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 bg-gradient-to-br from-green-900 to-emerald-900"><NewsImage article={tertiary} className="h-full w-full object-cover" /></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/50 to-transparent flex flex-col justify-end p-6">
            <span className="bg-green-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase w-fit mb-3">{tertiary.category_name || categoryName}</span>
            <h3 className="text-lg font-bold text-white leading-snug mb-3 group-hover:text-green-400 transition-colors">{tertiary.title}</h3>
            <div className="flex items-center gap-3 text-[11px] text-gray-400"><span className="flex items-center gap-1"><AuthorIcon className="w-3 h-3 text-green-500" />PCM</span></div>
          </div>
        </Link>
      )}
    </div>
  );
}

export default function CategoryView({ category, categoryNews, categories, popularNews, page, totalNews, sort }: {
  category: Category;
  categoryNews: NewsItem[];
  categories: NewsCategory[];
  popularNews: NewsItem[];
  page: number;
  totalNews: number;
  sort: Sort;
}) {
  const totalPages = Math.ceil(totalNews / 21);
  const trail = Array.isArray(category.categoryTrail) ? category.categoryTrail : [];
  const summary = newsPlainText(category.summary || category.description);
  const heroNews = categoryNews.slice(0, 3);
  const listNews = categoryNews.slice(3);
  const featuredCategories = categories.filter((entry) => entry.isFeatured);

  return (
    <>
      <Header />
      <main className="max-w-[1400px] mx-auto px-4 py-8 space-y-10">
        <nav aria-label="Đường dẫn" className="flex text-[13px] text-gray-400 gap-2 items-center overflow-hidden">
          <Link href="/" className="hover:text-blue-500 transition flex items-center gap-1 shrink-0 whitespace-nowrap">
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Trang chủ
          </Link>
          <span className="text-gray-600 shrink-0">/</span>
          <Link href="/tin-tuc" className="hover:text-blue-500 transition shrink-0 whitespace-nowrap">Tin tức</Link>
          {trail.slice(0, -1).map((entry) => (
            <span key={entry.id} className="contents"><span className="text-gray-600 shrink-0">/</span><Link href={`/tin-tuc/${entry.slug}`} className="hover:text-blue-500 transition shrink-0 whitespace-nowrap">{entry.name}</Link></span>
          ))}
          <span className="text-gray-600 shrink-0">/</span>
          <span className="text-white font-bold truncate min-w-0">{category.name}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1a1a1e] pb-6 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 uppercase tracking-tight mb-2">{category.name}</h1>
            <p className="text-gray-400 text-sm md:text-base max-w-2xl">{summary}</p>
          </div>
          <NewsCategoryShareControls />
        </div>

        <HeroNews articles={heroNews} categoryName={category.name} />

        <div className="flex flex-col lg:flex-row gap-8">
          <div data-news-list-column className="lg:w-[70%] space-y-6">
            {listNews.length > 0 ? (
              <div data-news-list className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {listNews.map((article, index) => (
                  <Link key={article.id} href={`/tin-tuc/${article.url}`} data-news-list-item className="bg-[#111115] border border-[#1a1a1e] rounded-[12px] overflow-hidden group cursor-pointer hover:border-blue-500/50 hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col">
                    <div className={`aspect-video relative overflow-hidden ${cardGradients[index % cardGradients.length]}`}>
                      <NewsImage article={article} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition duration-300" />
                      <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider">{article.category_name || category.name}</span>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h2 className="text-[16px] font-bold text-white mb-2 group-hover:text-blue-400 transition-colors leading-snug">{article.title}</h2>
                      <p className="text-[13px] text-gray-400 line-clamp-2 mb-4 flex-1">{newsPlainText(article.summary)}</p>
                      <div className="flex items-center justify-between border-t border-[#1a1a1e] pt-4 mt-auto">
                        <div className="flex items-center gap-2"><AuthorIcon className="w-4 h-4 text-gray-500" /><span className="text-[12px] font-medium text-gray-300">PCM</span></div>
                        <span className="text-[11px] text-gray-500">{formatNewsDate(article.createDate)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : totalNews === 0 ? (
              <div data-news-empty className="bg-[#111115] border border-[#1a1a1e] rounded-xl px-6 py-16 text-center text-sm text-gray-500">Danh mục này chưa có bài viết công khai.</div>
            ) : null}

            {totalPages > 1 && (
              <nav aria-label="Phân trang danh mục" className="flex justify-center items-center gap-2 pt-8">
                {page > 1 ? <Link aria-label="Trang trước" href={categoryHref(category.url, page - 1, sort)} className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#27272a] text-gray-400 hover:text-white hover:bg-[#1a1a1e] transition"><svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></Link> : <span aria-disabled="true" className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#27272a] text-gray-400 transition opacity-50 cursor-not-allowed"><svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></span>}
                {paginationItems(page, totalPages).map((item) => typeof item === 'number' ? (
                  item === page ? <span key={item} aria-current="page" className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)] text-white font-bold">{item}</span> : <Link key={item} href={categoryHref(category.url, item, sort)} className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#27272a] text-gray-400 hover:text-white hover:border-blue-500 transition">{item}</Link>
                ) : <span key={item} className="text-gray-500 px-1">...</span>)}
                {page < totalPages ? <Link aria-label="Trang sau" href={categoryHref(category.url, page + 1, sort)} className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#27272a] text-gray-400 hover:text-white hover:border-blue-500 transition"><svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></Link> : <span aria-disabled="true" className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#27272a] text-gray-400 transition opacity-50 cursor-not-allowed"><svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></span>}
              </nav>
            )}
          </div>

          <CategorySidebar categories={featuredCategories} popularNews={popularNews} />
        </div>
      </main>
      <Footer />
    </>
  );
}
