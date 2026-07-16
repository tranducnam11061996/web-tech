import Link from 'next/link';
import { Newspaper } from 'lucide-react';
import ProgressiveImage from './ProgressiveImage';
import type { NewsCategory } from '../lib/news';

const iconColors = [
  'text-blue-400',
  'text-purple-400',
  'text-green-400',
  'text-yellow-400',
  'text-red-400',
  'text-cyan-400',
];

export default function FeaturedNewsCategories({ categories }: { categories: NewsCategory[] }) {
  return (
    <section data-featured-news-categories aria-label="Danh mục bài viết nổi bật" className="text-center bg-[#111115] border border-[#1a1a1e] rounded-xl p-6">
      <h2 className="text-2xl font-black text-red-500 uppercase tracking-wide">nổi bật</h2>
      <p className="text-sm text-gray-500 italic mb-6">Tổng hợp các chuyên mục hot</p>

      <div className="grid grid-cols-3 gap-y-6 gap-x-2">
        {categories.map((category, index) => (
          <Link key={category.id} href={`/tin-tuc/${category.url}`} className="text-center cursor-pointer group">
            <div className={`w-[60px] h-[60px] bg-[#0a0a0c] rounded-full flex items-center justify-center mx-auto mb-2 border border-[#1a1a1e] text-[24px] transition-colors duration-200 group-hover:border-blue-500 ${iconColors[index % iconColors.length]}`}>
              {category.image ? (
                <ProgressiveImage src={category.image} alt="" fallbackText="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <Newspaper data-featured-fallback-icon aria-hidden="true" className="w-6 h-6" />
              )}
            </div>
            <p className="text-[11px] font-semibold text-gray-300 line-clamp-2">{category.name}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
