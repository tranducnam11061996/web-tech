import Link from 'next/link';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProgressiveImage from '../../../components/ProgressiveImage';
import Breadcrumb from '../../../components/Breadcrumb';
import FeaturedNewsCategories from '../../../components/FeaturedNewsCategories';
import MostReadNews from '../../../components/MostReadNews';
import PcBuildPromotionBanner from '../../../components/PcBuildPromotionBanner';
import {
  formatNewsDate,
  formatNewsDateTime,
  sanitizeNewsHtml,
  type NewsArticle,
  type NewsCategory,
  type NewsItem,
} from '../../../lib/news';
import ArticleShareControls from './ArticleShareControls';

const relatedFallbacks = [
  'bg-gradient-to-br from-blue-900 to-blue-800',
  'bg-gradient-to-br from-purple-900 to-purple-800',
  'bg-gradient-to-br from-green-900 to-green-800',
  'bg-gradient-to-br from-teal-900 to-teal-800',
  'bg-gradient-to-br from-yellow-900 to-yellow-800',
  'bg-gradient-to-br from-gray-700 to-gray-600',
];

function articleTags(value: unknown) {
  const seen = new Set<string>();
  return String(value || '').split(/\r?\n/).flatMap((entry) => {
    const tag = entry.trim();
    const key = tag.toLocaleLowerCase('vi-VN');
    if (!tag || seen.has(key)) return [];
    seen.add(key);
    return [tag];
  });
}

function RelatedArticleCard({ article, index }: { article: NewsItem; index: number }) {
  return (
    <Link data-related-article href={`/tin-tuc/${article.url}`} className="flex gap-4 cursor-pointer group">
      <div className={`w-[40%] sm:w-[140px] shrink-0 aspect-[4/3] bg-[#111115] rounded-[8px] overflow-hidden relative ${relatedFallbacks[index % relatedFallbacks.length]}`}>
        {article.thumnail ? <ProgressiveImage src={article.thumnail} alt={article.title} fallbackText="" hideOnError className="absolute inset-0 h-full w-full object-cover" /> : null}
        <div aria-hidden="true" className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition duration-300" />
      </div>
      <div className="flex-1 flex flex-col justify-start min-w-0">
        <h3 className="text-[14px] font-bold text-white mb-2 group-hover:text-blue-400 transition line-clamp-3 leading-snug">{article.title}</h3>
        <div className="flex items-center gap-1 text-[12px] text-blue-400 mb-1">
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
          <span>PCM</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gray-500">
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          <span>{formatNewsDateTime(article.createDate)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function ArticleView({ article, categories, popularNews }: {
  article: NewsArticle;
  categories: NewsCategory[];
  popularNews: NewsItem[];
}) {
  const trail = Array.isArray(article.categoryTrail) ? article.categoryTrail : [];
  const relatedNews = Array.isArray(article.relatedNews) ? article.relatedNews.slice(0, 6) : [];
  const content = sanitizeNewsHtml(article.content);
  const tags = articleTags(article.tags);
  const categoryName = trail.at(-1)?.name || article.category_name || '';
  const featuredCategories = categories.filter((category) => category.isFeatured);
  const updatedDate = formatNewsDate(article.lastUpdate || article.createDate);
  const views = Number(article.visit || 0).toLocaleString('vi-VN');

  return (
    <>
      <Header />
      <main data-article-template className="max-w-[1400px] mx-auto px-4 py-8 space-y-8">
        <Breadcrumb items={[
          { label: 'Tin tức', href: '/tin-tuc' },
          ...trail.map((category) => ({ label: category.name, href: `/tin-tuc/${category.slug}` })),
          { label: article.title },
        ]} />

        <div data-article-layout className="flex flex-col lg:flex-row gap-8">
          <div data-article-main className="lg:w-[70%] min-w-0 space-y-8">
            <header data-article-header className="space-y-4">
              <div className="flex items-center gap-3">
                {categoryName ? <span className="bg-blue-500/10 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-blue-500/30">{categoryName}</span> : null}
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight">{article.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 border-b border-[#1a1a1e] pb-6">
                <div className="flex items-center gap-2">
                  <div aria-hidden="true" className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">P</div>
                  <span className="font-medium text-white">PCM</span>
                </div>
                <span aria-hidden="true">•</span>
                <span>{updatedDate}</span>
                <span aria-hidden="true">•</span>
                <span>{views} lượt xem</span>
              </div>
            </header>

            <article data-article-content className="space-y-6 text-gray-300 leading-relaxed text-[16px] md:text-[17px]">
              {article.summary ? <p className="font-medium text-gray-200 text-lg md:text-xl">{article.summary}</p> : null}
              {article.thumnail ? (
                <figure className="my-8">
                  <div className="w-full aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-2xl relative group">
                    <ProgressiveImage src={article.thumnail} alt={article.title} fallbackText="" hideOnError className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                </figure>
              ) : null}
              {content ? (
                <div
                  className="space-y-6 [&_a]:text-blue-400 [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:bg-blue-500/5 [&_blockquote]:py-4 [&_blockquote]:pl-6 [&_blockquote]:pr-4 [&_blockquote]:rounded-r-xl [&_figcaption]:mt-3 [&_figcaption]:text-center [&_figcaption]:text-[13px] [&_figcaption]:italic [&_figcaption]:text-gray-500 [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-white [&_img]:mx-auto [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl [&_img]:shadow-2xl [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:text-white [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_ul]:list-disc"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              ) : <p className="text-gray-500">Bài viết chưa có nội dung chi tiết.</p>}
            </article>

            <div data-article-tags-share className={`flex flex-col sm:flex-row sm:items-center gap-4 py-6 border-y border-[#1a1a1e] ${tags.length ? 'justify-between' : 'sm:justify-end'}`}>
              {tags.length ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white mr-2">Tags:</span>
                  {tags.map((tag) => <span key={tag} className="px-3 py-1 bg-[#111115] border border-[#1a1a1e] text-gray-300 text-xs rounded-full">{tag}</span>)}
                </div>
              ) : null}
              <ArticleShareControls title={article.title} />
            </div>

            <section data-related-articles className="pt-4" aria-labelledby="related-articles-heading">
              <div className="flex items-center gap-3 mb-6">
                <div aria-hidden="true" className="w-1.5 h-6 bg-blue-500 rounded-full" />
                <h2 id="related-articles-heading" className="text-[18px] font-extrabold text-white uppercase">Bài viết liên quan</h2>
              </div>
              {relatedNews.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  {relatedNews.map((related, index) => <RelatedArticleCard key={related.id} article={related} index={index} />)}
                </div>
              ) : <p className="text-sm text-gray-500">Chưa có bài viết liên quan trong chuyên mục này.</p>}
            </section>
          </div>

          <aside data-article-sidebar className="lg:w-[30%] space-y-8">
            <FeaturedNewsCategories categories={featuredCategories} />
            <MostReadNews articles={popularNews} />
            <div data-pc-build-promotion-sticky className="lg:sticky lg:top-[110px]">
              <PcBuildPromotionBanner />
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
