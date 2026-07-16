import PcBuildPromotionBanner from './PcBuildPromotionBanner';
import FeaturedNewsCategories from './FeaturedNewsCategories';
import MostReadNews from './MostReadNews';
import type { NewsCategory, NewsItem } from '../lib/news';

export default function CategorySidebar({ categories, popularNews }: {
  categories: NewsCategory[];
  popularNews: NewsItem[];
}) {
  return (
    <aside data-news-sidebar className="lg:w-[30%] space-y-8">
      <FeaturedNewsCategories categories={categories} />
      <MostReadNews articles={popularNews} />

      <div data-pc-build-promotion-sticky className="lg:sticky lg:top-[110px]">
        <PcBuildPromotionBanner />
      </div>
    </aside>
  );
}
