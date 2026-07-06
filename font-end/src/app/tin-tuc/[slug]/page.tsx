import React from "react";
import { Metadata } from "next";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import CategoryView from "./CategoryView";
import ArticleView from "./ArticleView";


// Fetch data helper to reuse across Metadata and Page
async function fetchData(slug: string, page: number = 1) {
  try {
    const articleRes = await fetch(`http://localhost:3000/api/news/${slug}`, { next: { revalidate: 60 } });
    if (articleRes.ok) {
      const articleJson = await articleRes.json();
      if (articleJson.data) return { type: 'article', data: articleJson.data };
    }

    const categoryRes = await fetch(`http://localhost:3000/api/news-category/${slug}?page=${page}&limit=21`, { next: { revalidate: 60 } });
    if (categoryRes.ok) {
      const categoryJson = await categoryRes.json();
      if (categoryJson.data) return { type: 'category', data: categoryJson.data, news: categoryJson.news, totalNews: categoryJson.totalNews };
    }
  } catch (error) {
    console.error("Server fetch error:", error);
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const fetched = await fetchData(slug);
  
  if (!fetched) return { title: 'Không tìm thấy' };

  if (fetched.type === 'article') {
    const article = fetched.data;
    return {
      title: article.meta_title || article.title,
      description: article.meta_description || article.summary,
      keywords: article.meta_keyword,
      openGraph: {
        images: article.thumnail ? [`https://hacom.vn/media/news/${article.thumnail}`] : [],
      }
    };
  } else {
    const category = fetched.data;
    return {
      title: category.meta_title || category.name,
      description: category.meta_description || category.description,
      keywords: category.meta_keyword,
    };
  }
}

export default async function SingleTinTucPage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const page = sp.page ? parseInt(sp.page as string, 10) : 1;
  const fetched = await fetchData(slug, page);

  const article = fetched?.type === 'article' ? fetched.data : null;
  const category = fetched?.type === 'category' ? fetched.data : null;
  const categoryNews = fetched?.type === 'category' ? (fetched.news || []) : [];
  const totalNews = fetched?.type === 'category' ? (fetched.totalNews || 0) : 0;



  if (!article && !category) {
    return (
      <>     
        <Header />
        <div className="max-w-[1400px] mx-auto px-4 py-32 text-center text-white text-2xl font-bold">
           Không tìm thấy bài viết hoặc danh mục!
        </div>
        <Footer />
      </>
    );
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };


  if (category) {
    return <CategoryView category={category} categoryNews={categoryNews} formatDate={formatDate} page={page} totalNews={totalNews} />;
  }

  return <ArticleView article={article} formatDate={formatDate} />;
}
