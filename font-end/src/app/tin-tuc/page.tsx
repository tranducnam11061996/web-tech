import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProgressiveImage from '../../components/ProgressiveImage';
import { internalApiUrl } from '../../lib/apiUrl';
import { formatNewsDate, type NewsCategory, type NewsItem } from '../../lib/news';

type NewsPayload = {
  data: {
    items: NewsItem[];
    categories: NewsCategory[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
};

async function loadNews(page: number): Promise<NewsPayload | null> {
  try {
    const response = await fetch(internalApiUrl(`/api/news?page=${page}&limit=20`), { next: { revalidate: 60 } });
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Unable to load news index:', error);
    return null;
  }
}

export default async function TinTucPage({ searchParams }: { searchParams?: Promise<{ page?: string }> }) {
  const resolved = await searchParams;
  const requested = Number(resolved?.page || 1);
  const page = Number.isInteger(requested) && requested > 0 && requested <= 1_000 ? requested : 1;
  const payload = await loadNews(page);
  const items = payload?.data.items || [];
  const hero = page === 1 ? items.slice(0, 5) : [];
  const list = page === 1 ? items.slice(5) : items;
  const pagination = payload?.data.pagination;

  return (
    <>
      <Header />
      <main className="mx-auto min-h-[60vh] max-w-[1400px] space-y-10 px-4 py-8">
        <header className="flex flex-col gap-3 border-b border-[#27272a] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">PCMarket newsroom</p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">Tin tức công nghệ</h1>
          </div>
          {pagination && <p className="text-sm text-gray-400">{pagination.total.toLocaleString('vi-VN')} bài viết</p>}
        </header>

        {!payload && (
          <div className="rounded-2xl border border-red-900/50 bg-red-950/20 px-6 py-12 text-center text-red-200">
            Không thể tải tin tức lúc này. Vui lòng thử lại sau.
          </div>
        )}

        {payload && items.length === 0 && (
          <div className="rounded-2xl border border-[#27272a] bg-[#111115] px-6 py-16 text-center text-gray-400">
            Chưa có bài viết nào được công khai.
          </div>
        )}

        {hero.length > 0 && (
          <section aria-label="Tin mới nhất" className="grid gap-4 md:grid-cols-6">
            {hero.map((article, index) => (
              <Link
                href={`/tin-tuc/${article.url}`}
                key={article.id}
                className={`group relative min-h-[260px] overflow-hidden rounded-2xl bg-[#111115] ${index < 2 ? 'md:col-span-3' : 'md:col-span-2'}`}
              >
                {article.thumnail && <ProgressiveImage src={article.thumnail} alt={article.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="mb-2 text-xs font-bold uppercase text-blue-300">{article.category_name || 'Tin tức'}</p>
                  <h2 className={`${index < 2 ? 'text-xl sm:text-2xl' : 'text-lg'} font-bold leading-snug text-white group-hover:text-blue-300`}>{article.title}</h2>
                  <p className="mt-2 text-xs text-gray-300">{formatNewsDate(article.createDate)}</p>
                </div>
              </Link>
            ))}
          </section>
        )}

        {payload && (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section aria-label="Danh sách bài viết" className="space-y-5">
              {list.map((article) => (
                <Link href={`/tin-tuc/${article.url}`} key={article.id} className="group grid gap-5 rounded-2xl border border-[#202027] bg-[#111115] p-4 sm:grid-cols-[240px_1fr]">
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-[#18181d]">
                    {article.thumnail && <ProgressiveImage src={article.thumnail} alt={article.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                  </div>
                  <div className="self-center">
                    <p className="text-xs font-bold uppercase text-blue-400">{article.category_name || 'Tin tức'}</p>
                    <h2 className="mt-2 text-xl font-bold leading-snug text-white group-hover:text-blue-300">{article.title}</h2>
                    {article.summary && <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-400">{article.summary}</p>}
                    <p className="mt-4 text-xs text-gray-500">{formatNewsDate(article.createDate)}</p>
                  </div>
                </Link>
              ))}
              {pagination && pagination.totalPages > 1 && (
                <nav aria-label="Phân trang tin tức" className="flex items-center justify-center gap-3 pt-4">
                  {page > 1 && <Link className="rounded-lg border border-[#30303a] px-4 py-2 text-sm text-gray-300 hover:border-blue-500" href={`/tin-tuc?page=${page - 1}`}>Trang trước</Link>}
                  <span className="text-sm text-gray-500">Trang {page}/{pagination.totalPages}</span>
                  {page < pagination.totalPages && <Link className="rounded-lg border border-[#30303a] px-4 py-2 text-sm text-gray-300 hover:border-blue-500" href={`/tin-tuc?page=${page + 1}`}>Trang sau</Link>}
                </nav>
              )}
            </section>

            <aside>
              <div className="sticky top-24 rounded-2xl border border-[#202027] bg-[#111115] p-5">
                <h2 className="text-sm font-black uppercase tracking-wider text-white">Danh mục bài viết</h2>
                <div className="mt-4 divide-y divide-[#24242b]">
                  {payload.data.categories.map((category) => (
                    <Link key={category.id} href={`/tin-tuc/${category.url}`} className="flex items-center justify-between gap-4 py-4 text-sm text-gray-300 hover:text-blue-300">
                      <span>{category.name}</span><span className="rounded-full bg-[#202027] px-2 py-1 text-xs">{category.totalNews}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
