import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { internalApiUrl } from '../../../lib/apiUrl';
import ArticleView from './ArticleView';
import CategoryView from './CategoryView';

type Loaded =
  | { type: 'article'; data: any }
  | { type: 'category'; data: any; news: any[]; totalNews: number; pagination?: any };

async function fetchData(slug: string, page = 1): Promise<Loaded | null> {
  const encoded = encodeURIComponent(slug);
  try {
    const articleResponse = await fetch(internalApiUrl(`/api/news/${encoded}`), { next: { revalidate: 60 } });
    if (articleResponse.ok) {
      const payload = await articleResponse.json();
      if (payload.data) return { type: 'article', data: payload.data };
    }
    const categoryResponse = await fetch(internalApiUrl(`/api/news-category/${encoded}?page=${page}&limit=21`), { next: { revalidate: 60 } });
    if (categoryResponse.ok) {
      const payload = await categoryResponse.json();
      if (payload.data) return { type: 'category', data: payload.data, news: payload.news || [], totalNews: payload.totalNews || 0, pagination: payload.pagination };
    }
  } catch (error) {
    console.error('Unable to load news route:', error);
  }
  return null;
}

function siteOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  try { return new URL(value).origin; } catch { return 'http://localhost:3001'; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await fetchData(slug);
  if (!loaded) return { title: 'Không tìm thấy', robots: { index: false, follow: false } };
  const entity = loaded.data;
  const title = entity.meta_title || entity.title || entity.name;
  const description = entity.meta_description || entity.summary || entity.description || '';
  const canonical = `${siteOrigin()}/tin-tuc/${slug}`;
  const image = loaded.type === 'article' ? entity.thumnail : entity.imgUrl;
  return {
    title,
    description,
    keywords: entity.meta_keywords || entity.meta_keyword || undefined,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: loaded.type === 'article' ? 'article' : 'website', images: image ? [image] : [] },
  };
}

export default async function NewsRoute({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const resolved = await searchParams;
  const requested = Number(resolved?.page || 1);
  const page = Number.isInteger(requested) && requested > 0 && requested <= 1_000 ? requested : 1;
  const loaded = await fetchData(slug, page);
  if (!loaded) notFound();
  if (loaded.type === 'category') {
    return <CategoryView category={loaded.data} categoryNews={loaded.news} page={page} totalNews={loaded.totalNews} />;
  }
  return <ArticleView article={loaded.data} />;
}
