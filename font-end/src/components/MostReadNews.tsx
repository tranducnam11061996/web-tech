import Link from 'next/link';
import type { NewsItem } from '../lib/news';

export default function MostReadNews({ articles }: { articles: NewsItem[] }) {
  return (
    <section data-most-read-news aria-label="Bài viết được đọc nhiều nhất" className="bg-[#111115] border border-[#1a1a1e] rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[#1a1a1e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div aria-hidden="true" className="w-1.5 h-4 bg-red-500 rounded-full" />
          <h2 className="font-bold text-[14px] text-white uppercase tracking-wide">Đọc nhiều nhất</h2>
        </div>
        <span className="text-red-500 text-xs font-bold animate-pulse">🔥 HOT</span>
      </div>

      <div className="p-4 space-y-4">
        {articles.map((article, index) => (
          <Link key={article.id} href={`/tin-tuc/${article.url}`} className="flex gap-3 cursor-pointer group border-b border-[#1a1a1e] pb-4 last:border-b-0 last:pb-0">
            <div aria-hidden="true" className="w-[30px] font-black text-2xl text-gray-700 group-hover:text-red-500 transition">{String(index + 1).padStart(2, '0')}</div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition">{article.title}</p>
              <p className="text-[11px] text-gray-500 mt-1">{Number(article.visit || 0).toLocaleString('vi-VN')} lượt xem</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
