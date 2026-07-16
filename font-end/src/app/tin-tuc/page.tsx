import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import FeaturedNewsCategories from '../../components/FeaturedNewsCategories';
import PcBuildPromotionBanner from '../../components/PcBuildPromotionBanner';
import ProgressiveImage from '../../components/ProgressiveImage';
import { internalApiUrl } from '../../lib/apiUrl';
import {
  formatNewsDate,
  formatNewsRelativeDate,
  type NewsCategory,
  type NewsItem,
  type YoutubeChannelPayload,
} from '../../lib/news';
import PcmOfficialVideos from './PcmOfficialVideos';

type NewsLandingPayload = {
  data: {
    news: NewsItem[];
    reviews: NewsItem[];
    categories: NewsCategory[];
    youtube: YoutubeChannelPayload;
  };
};

const heroGradients = [
  'from-blue-900 to-purple-600',
  'from-red-900 to-orange-600',
  'from-emerald-900 to-emerald-500',
  'from-blue-900 to-blue-600',
  'from-purple-900 to-pink-700',
];

const listGradients = [
  'from-gray-800 to-gray-900',
  'from-blue-900 to-blue-800',
  'from-green-900 to-green-800',
  'from-red-900 to-red-800',
  'from-purple-900 to-purple-800',
  'from-cyan-900 to-cyan-800',
];

const reviewGradients = [
  'from-indigo-900 to-purple-900',
  'from-red-900 to-orange-900',
  'from-gray-800 to-gray-900',
  'from-blue-900 to-cyan-900',
  'from-cyan-900 to-blue-900',
  'from-gray-700 to-gray-800',
];

async function loadNewsLanding(): Promise<NewsLandingPayload | null> {
  try {
    const response = await fetch(internalApiUrl('/api/news/landing'), { next: { revalidate: 60 } });
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Unable to load news landing:', error);
    return null;
  }
}

function HeroCard({ article, index, large }: { article: NewsItem; index: number; large: boolean }) {
  return (
    <Link
      data-news-landing-hero
      href={`/tin-tuc/${article.url}`}
      className={`relative overflow-hidden rounded-[12px] cursor-pointer group aspect-[16/9] ${large ? 'md:aspect-[2/1]' : ''}`}
    >
      <span className={`absolute inset-0 bg-gradient-to-br ${heroGradients[index % heroGradients.length]} bg-cover bg-center transition-transform duration-500 group-hover:scale-105`}>
        {article.thumnail ? (
          <ProgressiveImage src={article.thumnail} alt="" fallbackText="" hideOnError className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </span>
      <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.1)_60%,transparent_100%)] flex flex-col justify-end p-[20px]">
        <span className="bg-white/20 backdrop-blur-[4px] px-[8px] py-[2px] rounded-[4px] text-[10px] font-bold uppercase inline-block mb-[8px] w-fit">
          {article.category_name || 'Tin tức'}
        </span>
        {large ? (
          <>
            <span className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight">{article.title}</span>
            <span className="text-xs text-gray-300">PCM - {formatNewsDate(article.createDate)}</span>
          </>
        ) : (
          <span className="text-sm md:text-base font-bold text-white mb-1 leading-snug">{article.title}</span>
        )}
      </span>
    </Link>
  );
}

function NewsListItem({ article, index }: { article: NewsItem; index: number }) {
  return (
    <article data-news-landing-list-item className="flex gap-[16px] mb-[20px] pb-[20px] border-b border-[#1a1a1e] last:border-b-0">
      <Link href={`/tin-tuc/${article.url}`} aria-label={article.title} className={`w-[30%] aspect-video bg-[#111115] rounded-[8px] overflow-hidden shrink-0 relative bg-gradient-to-br ${listGradients[index % listGradients.length]}`}>
        {article.thumnail ? (
          <ProgressiveImage src={article.thumnail} alt="" fallbackText="" hideOnError className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </Link>
      <div className="flex-1 min-w-0">
        <h4 className="text-lg font-bold text-white mb-2 hover:text-blue-400 cursor-pointer">
          <Link href={`/tin-tuc/${article.url}`}>{article.title}</Link>
        </h4>
        <p className="text-xs text-gray-400 mb-2"><span className="font-bold text-gray-300">PCM</span> - {formatNewsRelativeDate(article.createDate)}</p>
        {article.summary ? <p className="text-sm text-gray-500 line-clamp-2">{article.summary}</p> : null}
      </div>
    </article>
  );
}

function ReviewLargeCard({ article, index }: { article: NewsItem; index: number }) {
  return (
    <Link data-news-review-large href={`/tin-tuc/${article.url}`} className="mb-6 cursor-pointer group block">
      <span className={`aspect-[16/9] bg-gradient-to-br ${reviewGradients[index % reviewGradients.length]} rounded-xl mb-4 overflow-hidden relative block`}>
        {article.thumnail ? <ProgressiveImage src={article.thumnail} alt="" fallbackText="" hideOnError className="absolute inset-0 h-full w-full object-cover" /> : null}
        <span className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition duration-300" aria-hidden="true" />
      </span>
      <span className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition leading-snug block">{article.title}</span>
      <span className="text-xs text-gray-500">{formatNewsRelativeDate(article.createDate)}</span>
    </Link>
  );
}

function ReviewSmallCard({ article, index }: { article: NewsItem; index: number }) {
  return (
    <Link data-news-review-small href={`/tin-tuc/${article.url}`} className="flex gap-4 cursor-pointer group">
      <span className={`w-[120px] shrink-0 aspect-[4/3] bg-gradient-to-br ${reviewGradients[index % reviewGradients.length]} rounded-lg overflow-hidden relative`}>
        {article.thumnail ? <ProgressiveImage src={article.thumnail} alt="" fallbackText="" hideOnError className="absolute inset-0 h-full w-full object-cover" /> : null}
      </span>
      <span className="min-w-0">
        <span className="text-sm font-bold text-white mb-1 group-hover:text-blue-400 transition leading-snug line-clamp-2 block">{article.title}</span>
        {article.summary ? <span className="text-[12px] text-gray-500 line-clamp-2 mb-1 block">{article.summary}</span> : null}
        <span className="text-[11px] text-gray-600">{formatNewsDate(article.createDate)}</span>
      </span>
    </Link>
  );
}

function ReviewsSection({ reviews }: { reviews: NewsItem[] }) {
  const columns = [
    [reviews[0], reviews[2], reviews[3]],
    [reviews[1], reviews[4], reviews[5]],
  ].map((column) => column.filter((article): article is NewsItem => Boolean(article)));

  return (
    <section data-news-reviews>
      <div className="flex justify-between items-end mb-6 border-b border-[#1a1a1e] pb-3">
        <h3 className="text-[18px] font-extrabold uppercase flex items-center gap-[8px] text-blue-500 mb-0"><span className="text-blue-500 text-xl" aria-hidden="true">👍</span> ĐÁNH GIÁ</h3>
        <Link href="/tin-tuc/review-san-pham" className="text-[13px] font-bold text-blue-500 hover:text-blue-400 transition uppercase tracking-wide">XEM THÊM</Link>
      </div>

      {reviews.length === 0 ? (
        <div data-news-reviews-empty className="rounded-xl border border-[#1a1a1e] bg-[#0d0d10] px-6 py-12 text-center text-sm text-gray-500">Chưa có bài viết trong danh mục Review Sản Phẩm.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {columns.map((column, columnIndex) => (
            <div key={columnIndex}>
              {column[0] ? <ReviewLargeCard article={column[0]} index={columnIndex} /> : null}
              {column.length > 1 ? (
                <div className="space-y-4">
                  {column.slice(1).map((article) => <ReviewSmallCard key={article.id} article={article} index={reviews.findIndex((item) => item.id === article.id)} />)}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function TinTucPage() {
  const payload = await loadNewsLanding();
  const data = payload?.data;
  const heroPrimary = data?.news.slice(0, 2) || [];
  const heroSecondary = data?.news.slice(2, 5) || [];
  const newsList = data?.news.slice(5, 11) || [];
  const featuredCategories = data?.categories.filter((category) => category.isFeatured) || [];

  return (
    <>
      <Header />
      <main className="max-w-[1400px] mx-auto px-4 py-8 space-y-12 min-h-[60vh]">
        {!data ? (
          <div className="rounded-xl border border-red-900/50 bg-red-950/20 px-6 py-12 text-center text-red-200">Không thể tải tin tức lúc này. Vui lòng thử lại sau.</div>
        ) : (
          <>
            {data.news.length === 0 ? (
              <div data-news-landing-empty className="rounded-xl border border-[#1a1a1e] bg-[#0d0d10] px-6 py-12 text-center text-sm text-gray-500">Chưa có bài viết công khai trong các danh mục tin tức đã chọn.</div>
            ) : (
              <section aria-label="Tin mới nhất" className="space-y-4">
                <div data-news-landing-hero-row="primary" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {heroPrimary.map((article, index) => <HeroCard key={article.id} article={article} index={index} large />)}
                </div>
                <div data-news-landing-hero-row="secondary" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {heroSecondary.map((article, index) => <HeroCard key={article.id} article={article} index={index + 2} large={false} />)}
                </div>
              </section>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
              <section data-news-landing-list className="lg:w-[70%]">
                <h3 className="text-[18px] font-extrabold uppercase mb-[20px] flex items-center gap-[8px] text-blue-500">TIN TỨC</h3>
                {newsList.map((article, index) => <NewsListItem key={article.id} article={article} index={index} />)}
                {newsList.length === 0 ? <p className="text-sm text-gray-500">Chưa có thêm bài viết để hiển thị.</p> : null}
                <div className="flex items-center justify-between mt-6">
                  <div className="flex gap-2" />
                  <Link href="/tin-tuc/tin-cong-nghe.html" className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded transition">XEM THÊM</Link>
                </div>
              </section>

              <aside data-news-landing-sidebar className="lg:w-[30%] space-y-8">
                <FeaturedNewsCategories categories={featuredCategories} />
                <div data-news-landing-promotion>
                  <PcBuildPromotionBanner />
                </div>
              </aside>
            </div>

            <section data-pcm-official>
              <h3 className="text-[18px] font-extrabold uppercase mb-[20px] flex items-center gap-[8px] text-red-500"><span className="text-red-600" aria-hidden="true">▶</span> PCM Official</h3>
              <PcmOfficialVideos youtube={data.youtube} />
            </section>

            <ReviewsSection reviews={data.reviews} />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
