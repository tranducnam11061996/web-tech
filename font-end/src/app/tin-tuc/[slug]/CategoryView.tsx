import Link from 'next/link';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProgressiveImage from '../../../components/ProgressiveImage';
import Breadcrumb from '../../../components/Breadcrumb';
import { formatNewsDate, type NewsItem } from '../../../lib/news';

type Category = {
  id: number;
  name: string;
  url: string;
  summary?: string;
  description?: string;
  categoryTrail?: Array<{ id: number; name: string; slug: string }>;
};

export default function CategoryView({ category, categoryNews, page, totalNews }: {
  category: Category;
  categoryNews: NewsItem[];
  page: number;
  totalNews: number;
}) {
  const totalPages = Math.ceil(totalNews / 21);
  const trail = Array.isArray(category.categoryTrail) ? category.categoryTrail : [];
  return (
    <>
      <Header />
      <main className="mx-auto min-h-[60vh] max-w-[1400px] px-4 py-8">
        <Breadcrumb items={[
          { label: 'Tin tức', href: '/tin-tuc' },
          ...trail.map((entry, index) => ({ label: entry.name, href: index < trail.length - 1 ? `/tin-tuc/${entry.slug}` : undefined })),
        ]} />
        <header className="mt-8 border-b border-[#27272a] pb-7">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">Danh mục bài viết</p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">{category.name}</h1>
          {(category.summary || category.description) && <p className="mt-4 max-w-3xl text-base leading-7 text-gray-400">{category.summary || category.description}</p>}
          <p className="mt-3 text-sm text-gray-500">{totalNews.toLocaleString('vi-VN')} bài viết</p>
        </header>

        <section className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categoryNews.map((article) => (
            <Link href={`/tin-tuc/${article.url}`} key={article.id} className="group overflow-hidden rounded-2xl border border-[#202027] bg-[#111115]">
              <div className="relative aspect-video bg-[#18181d]">
                {article.thumnail && <ProgressiveImage src={article.thumnail} alt={article.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
              </div>
              <div className="p-5">
                <p className="text-xs text-gray-500">{formatNewsDate(article.createDate)}</p>
                <h2 className="mt-2 text-lg font-bold leading-snug text-white group-hover:text-blue-300">{article.title}</h2>
                {article.summary && <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-400">{article.summary}</p>}
              </div>
            </Link>
          ))}
        </section>
        {categoryNews.length === 0 && <div className="mt-8 rounded-2xl border border-[#27272a] bg-[#111115] py-16 text-center text-gray-500">Danh mục này chưa có bài viết công khai.</div>}

        {totalPages > 1 && (
          <nav aria-label="Phân trang danh mục" className="mt-10 flex items-center justify-center gap-3">
            {page > 1 && <Link className="rounded-lg border border-[#30303a] px-4 py-2 text-sm text-gray-300 hover:border-blue-500" href={`?page=${page - 1}`}>Trang trước</Link>}
            <span className="text-sm text-gray-500">Trang {page}/{totalPages}</span>
            {page < totalPages && <Link className="rounded-lg border border-[#30303a] px-4 py-2 text-sm text-gray-300 hover:border-blue-500" href={`?page=${page + 1}`}>Trang sau</Link>}
          </nav>
        )}
      </main>
      <Footer />
    </>
  );
}
