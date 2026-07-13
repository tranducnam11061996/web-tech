import Link from 'next/link';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProgressiveImage from '../../../components/ProgressiveImage';
import Breadcrumb from '../../../components/Breadcrumb';
import { formatNewsDate, sanitizeNewsHtml, type NewsItem } from '../../../lib/news';

type Article = NewsItem & {
  content?: string;
  categoryTrail?: Array<{ id: number; name: string; slug: string }>;
  relatedNews?: NewsItem[];
};

export default function ArticleView({ article }: { article: Article }) {
  const trail = Array.isArray(article.categoryTrail) ? article.categoryTrail : [];
  const content = sanitizeNewsHtml(article.content);
  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1400px] px-4 py-8">
        <Breadcrumb items={[
          { label: 'Tin tức', href: '/tin-tuc' },
          ...trail.map((category, index) => ({ label: category.name, href: index < trail.length - 1 ? `/tin-tuc/${category.slug}` : undefined })),
          { label: article.title },
        ]} />
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <article className="min-w-0 rounded-2xl border border-[#202027] bg-[#111115] p-5 sm:p-9">
            {article.category_name && <p className="text-xs font-bold uppercase tracking-wider text-blue-400">{article.category_name}</p>}
            <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl">{article.title}</h1>
            <p className="mt-4 text-sm text-gray-500">Đăng ngày {formatNewsDate(article.createDate)}</p>
            {article.summary && <p className="mt-7 border-l-4 border-blue-500 pl-5 text-lg leading-8 text-gray-300">{article.summary}</p>}
            {article.thumnail && <ProgressiveImage src={article.thumnail} alt={article.title} className="mt-8 max-h-[620px] w-full rounded-2xl object-cover" />}
            {content ? (
              <div
                className="mt-9 space-y-5 text-[16px] leading-8 text-gray-300 [&_a]:text-blue-400 [&_a]:underline [&_h2]:pt-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h3]:pt-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-white [&_img]:mx-auto [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl [&_li]:ml-5 [&_ol]:list-decimal [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_ul]:list-disc"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : <p className="mt-9 text-gray-500">Bài viết chưa có nội dung chi tiết.</p>}
          </article>

          <aside>
            <div className="sticky top-24 rounded-2xl border border-[#202027] bg-[#111115] p-5">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Bài viết liên quan</h2>
              <div className="mt-4 divide-y divide-[#24242b]">
                {(article.relatedNews || []).map((related) => (
                  <Link key={related.id} href={`/tin-tuc/${related.url}`} className="group grid grid-cols-[96px_1fr] gap-3 py-4">
                    <div className="relative aspect-video overflow-hidden rounded-lg bg-[#202027]">
                      {related.thumnail && <ProgressiveImage src={related.thumnail} alt={related.title} className="absolute inset-0 h-full w-full object-cover" />}
                    </div>
                    <div>
                      <h3 className="line-clamp-2 text-sm font-bold leading-5 text-gray-200 group-hover:text-blue-300">{related.title}</h3>
                      <p className="mt-1 text-[11px] text-gray-500">{formatNewsDate(related.createDate)}</p>
                    </div>
                  </Link>
                ))}
                {!article.relatedNews?.length && <p className="py-5 text-sm text-gray-500">Chưa có bài liên quan.</p>}
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
