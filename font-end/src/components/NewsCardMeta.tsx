import { formatNewsDate, type NewsItem } from '../lib/news';

type NewsCardMetaProps = {
  article: Pick<NewsItem, 'createDate' | 'visit'>;
  className?: string;
};

function formatNewsViews(value: number | undefined) {
  const views = Number(value);
  return Math.max(0, Number.isFinite(views) ? Math.trunc(views) : 0).toLocaleString('vi-VN');
}

export default function NewsCardMeta({ article, className = '' }: NewsCardMetaProps) {
  return (
    <div
      data-news-card-meta
      className={`flex flex-wrap items-center justify-start gap-x-4 gap-y-2 text-gray-400 tabular-nums ${className}`}
    >
      <time data-news-card-date dateTime={article.createDate} className="flex items-center gap-1.5">
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="size-3.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        {formatNewsDate(article.createDate)}
      </time>
      <span data-news-card-views className="flex items-center gap-1.5">
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="size-3.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .638C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
        Lượt xem: {formatNewsViews(article.visit)}
      </span>
    </div>
  );
}
