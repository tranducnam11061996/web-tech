import Link from "next/link";
import ProgressiveImage from "./ProgressiveImage";

export type RelatedPostData = {
  id: number;
  title: string;
  slug: string;
  thumbnail?: string;
  summary?: string;
  publishedAt?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export default function RelatedPosts({ posts = [] }: { posts?: RelatedPostData[] }) {
  return (
    <section className="mx-auto max-w-[1800px] px-4 py-6 md:px-6" aria-labelledby="related-posts-title">
      <div className="rounded-2xl border border-[#1a1a1e] bg-[#111115] p-4 md:p-6">
        <div className="mb-5">
          <h2 id="related-posts-title" className="text-xl font-bold text-white md:text-2xl">
            Bài viết liên quan
          </h2>
        </div>

        {posts.length > 0 ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {posts.slice(0, 5).map((post) => (
              <article key={post.id} className="group min-w-0 overflow-hidden rounded-xl border border-[#27272a] bg-[#151518]">
                <Link href={`/tin-tuc/${post.slug}`} className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                  <div className="relative aspect-video overflow-hidden bg-[#1a1a1e]">
                    {post.thumbnail ? (
                      <ProgressiveImage src={post.thumbnail} alt={post.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-bold uppercase tracking-widest text-zinc-600">Tin tức</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-2 text-sm font-bold leading-6 text-zinc-100 transition-colors group-hover:text-blue-300">
                      {post.title}
                    </h3>
                    {post.summary ? <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-500">{post.summary}</p> : null}
                    {formatDate(post.publishedAt) ? <time className="mt-auto pt-4 text-xs text-zinc-600" dateTime={post.publishedAt || undefined}>{formatDate(post.publishedAt)}</time> : null}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p role="status" className="rounded-xl border border-dashed border-[#27272a] py-10 text-center text-sm text-zinc-500">
            Chưa có bài viết liên quan.
          </p>
        )}
      </div>
    </section>
  );
}
