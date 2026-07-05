import React from "react";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import ProgressiveImage from "../../../components/ProgressiveImage";
import Link from "next/link";
import { Metadata } from "next";

// Fetch data helper to reuse across Metadata and Page
async function fetchData(slug: string) {
  try {
    const articleRes = await fetch(`http://localhost:3000/api/news/${slug}`, { next: { revalidate: 60 } });
    if (articleRes.ok) {
      const articleJson = await articleRes.json();
      if (articleJson.data) return { type: 'article', data: articleJson.data };
    }

    const categoryRes = await fetch(`http://localhost:3000/api/news-category/${slug}`, { next: { revalidate: 60 } });
    if (categoryRes.ok) {
      const categoryJson = await categoryRes.json();
      if (categoryJson.data) return { type: 'category', data: categoryJson.data, news: categoryJson.news };
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

export default async function SingleTinTucPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fetched = await fetchData(slug);

  const article = fetched?.type === 'article' ? fetched.data : null;
  const category = fetched?.type === 'category' ? fetched.data : null;
  const categoryNews = fetched?.type === 'category' ? fetched.news : [];



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

  // CATEGORY RENDER
  if (category) {
    return (
      <>     
        <Header />
        <div className="max-w-[1400px] mx-auto px-4 py-8 space-y-8">
          <nav className="flex text-[13px] text-gray-400 gap-2 items-center mb-6 overflow-hidden">
            <Link href="/" className="hover:text-blue-500 transition flex items-center gap-1 shrink-0 whitespace-nowrap">
              Trang chủ
            </Link>
            <span className="text-gray-600 shrink-0">/</span>
            <Link href="/tin-tuc" className="hover:text-blue-500 transition shrink-0 whitespace-nowrap">Tin tức</Link>
            <span className="text-gray-600 shrink-0">/</span>
            <span className="text-gray-200 truncate min-w-0">{category.name}</span>
          </nav>

          <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-8 mb-8 text-center">
             <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wide">{category.name}</h1>
             {category.description && (
               <p className="text-gray-400 mt-4 max-w-2xl mx-auto">{category.description}</p>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryNews.map((newsItem) => (
              <Link href={`/tin-tuc/${newsItem.url}`} key={newsItem.id} className="group flex flex-col bg-[#0d0d10] border border-[#1a1a1e] rounded-xl overflow-hidden hover:border-blue-500/50 transition duration-300">
                <div className="w-full aspect-video relative overflow-hidden bg-[#111115]">
                  {newsItem.thumnail ? (
                    <ProgressiveImage 
                      src={`https://hacom.vn/media/news/${newsItem.thumnail}`} 
                      alt={newsItem.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-bold text-2xl">NO IMAGE</div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition line-clamp-2 leading-snug">{newsItem.title}</h3>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-3">
                    <span className="text-blue-400 font-bold">{newsItem.createBy === 1 ? "Admin" : "Author"}</span>
                    <span>•</span>
                    <span>{formatDate(newsItem.createDate)}</span>
                    <span>•</span>
                    <span>{newsItem.visit || 0} views</span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed mt-auto">{newsItem.summary}</p>
                </div>
              </Link>
            ))}
          </div>

          {categoryNews.length === 0 && (
             <div className="py-20 text-center text-gray-500">Chưa có bài viết nào trong danh mục này.</div>
          )}
        </div>
        <Footer />    
      </>
    );
  }

  // ARTICLE RENDER

  return (
    <>     
        <Header />
<div className="max-w-[1400px] mx-auto px-4 py-8 space-y-8">
  
  {/* BREADCRUMB */}
  <nav className="flex text-[13px] text-gray-400 gap-2 items-center mb-6 overflow-hidden">
    <a href="#" className="hover:text-blue-500 transition flex items-center gap-1 shrink-0 whitespace-nowrap">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
      Trang chủ
    </a>
    <span className="text-gray-600 shrink-0">/</span>
    <a href="#" className="hover:text-blue-500 transition shrink-0 whitespace-nowrap">Tin tức</a>
    <span className="text-gray-600 shrink-0">/</span>
    <a href="#" className="hover:text-blue-500 transition shrink-0 whitespace-nowrap">Công nghệ</a>
    <span className="text-gray-600 shrink-0">/</span>
    <span className="text-gray-200 truncate min-w-0">{article.title}</span>
  </nav>

  <div className="flex flex-col lg:flex-row gap-8">
    
    {/* LEFT CONTENT (70%) */}
    <div className="lg:w-[70%] space-y-8">
      
      {/* ARTICLE HEADER */}
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="bg-blue-500/10 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-blue-500/30">
            {article.category_name || "Tin Tức"}
          </span>
          <span className="text-sm text-gray-500">{formatDate(article.createDate)}</span>
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight">{article.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-400 border-b border-[#1a1a1e] pb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
              {article.lastUpdateByUser ? article.lastUpdateByUser.charAt(0).toUpperCase() : "A"}
            </div>
            <span className="font-medium text-white">{article.lastUpdateByUser || "Admin"}</span>
          </div>
          <span>•</span>
          <span>{formatDate(article.lastUpdate)}</span>
          <span>•</span>
          <span>{article.visit} lượt xem</span>
        </div>
      </header>

      {/* ARTICLE CONTENT */}
      <article className="mt-8">
        <p className="font-medium text-gray-200 text-lg md:text-xl mb-8 leading-relaxed">
          {article.summary}
        </p>

        {article.thumnail && (
          <figure className="my-8">
            <div className="w-full aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-2xl relative group">
              <ProgressiveImage 
                src={`https://hacom.vn/media/news/${article.thumnail}`} 
                alt={article.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </figure>
        )}

        <div 
          className="static-html-content text-gray-300 text-[16px] md:text-[17px] leading-relaxed 
            [&_h1]:text-white [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6
            [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-5
            [&_h3]:text-white [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-3 [&_h3]:mt-4
            [&_h4]:text-white [&_h4]:text-base [&_h4]:font-bold [&_h4]:mb-2 [&_h4]:mt-4
            [&_p]:mb-4 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4 [&_img]:mx-auto
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4
            [&_strong]:text-white [&_strong]:font-bold
            [&_a]:text-blue-400 hover:[&_a]:text-blue-300 [&_a]:transition-colors"
          dangerouslySetInnerHTML={{ __html: (article.content || "").replace(/src=["']\.\.\/media\//g, 'src="https://hacom.vn/media/') }} 
        />
      </article>

      {/* TAGS & SHARE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 border-y border-[#1a1a1e]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-white mr-2">Tags:</span>
          <a href="#" className="px-3 py-1 bg-[#111115] hover:bg-blue-600 hover:text-white border border-[#1a1a1e] hover:border-blue-600 text-gray-300 text-xs rounded-full transition-all">Intel</a>
          <a href="#" className="px-3 py-1 bg-[#111115] hover:bg-blue-600 hover:text-white border border-[#1a1a1e] hover:border-blue-600 text-gray-300 text-xs rounded-full transition-all">18A-P</a>
          <a href="#" className="px-3 py-1 bg-[#111115] hover:bg-blue-600 hover:text-white border border-[#1a1a1e] hover:border-blue-600 text-gray-300 text-xs rounded-full transition-all">Semiconductor</a>
          <a href="#" className="px-3 py-1 bg-[#111115] hover:bg-blue-600 hover:text-white border border-[#1a1a1e] hover:border-blue-600 text-gray-300 text-xs rounded-full transition-all">TSMC</a>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">Chia sẻ:</span>
          <button className="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center text-white hover:opacity-80 transition"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></button>
          <button className="w-8 h-8 rounded-full bg-[#1DA1F2] flex items-center justify-center text-white hover:opacity-80 transition"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg></button>
          <button className="w-8 h-8 rounded-full bg-[#111115] border border-[#1a1a1e] flex items-center justify-center text-white hover:bg-[#27272a] transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg></button>
        </div>
      </div>

      {/* RELATED ARTICLES */}
      <div className="pt-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
          <h3 className="text-[18px] font-extrabold text-white uppercase">Bài viết liên quan</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
          
          {/* Article 1 */}
          <div className="flex gap-4 cursor-pointer group">
            <div className="w-[40%] sm:w-[140px] shrink-0 aspect-[4/3] bg-[#111115] rounded-[8px] overflow-hidden relative bg-gradient-to-br from-blue-900 to-blue-800">
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition duration-300"></div>
            </div>
            <div className="flex-1 flex flex-col justify-start">
              <h4 className="text-[14px] font-bold text-white mb-2 group-hover:text-blue-400 transition line-clamp-3 leading-snug">ChatGPT Pro 200 USD giúp người dùng "săn" MacBook Pro M5 Max rẻ hơn tới 2000 USD</h4>
              <div className="flex items-center gap-1 text-[12px] text-blue-400 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                <span>Hải Nam</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <span>03/07/2026 14:16</span>
              </div>
            </div>
          </div>
          
          {/* Article 2 */}
          <div className="flex gap-4 cursor-pointer group">
            <div className="w-[40%] sm:w-[140px] shrink-0 aspect-[4/3] bg-[#111115] rounded-[8px] overflow-hidden relative bg-gradient-to-br from-purple-900 to-purple-800">
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition duration-300"></div>
            </div>
            <div className="flex-1 flex flex-col justify-start">
              <h4 className="text-[14px] font-bold text-white mb-2 group-hover:text-blue-400 transition line-clamp-3 leading-snug">LG ra mắt thế hệ laptop LG gram AI 2026: Mỏng nhẹ tinh tế, bứt phá hiệu năng với Dual AI</h4>
              <div className="flex items-center gap-1 text-[12px] text-blue-400 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                <span>SHIRO</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <span>02/07/2026 22:02</span>
              </div>
            </div>
          </div>

          {/* Article 3 */}
          <div className="flex gap-4 cursor-pointer group">
            <div className="w-[40%] sm:w-[140px] shrink-0 aspect-[4/3] bg-[#111115] rounded-[8px] overflow-hidden relative bg-gradient-to-br from-green-900 to-green-800">
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition duration-300"></div>
            </div>
            <div className="flex-1 flex flex-col justify-start">
              <h4 className="text-[14px] font-bold text-white mb-2 group-hover:text-blue-400 transition line-clamp-3 leading-snug">Mua laptop Lenovo cho sinh viên: Đồng hành cùng sinh viên từ giảng đường cho đến khi đi làm</h4>
              <div className="flex items-center gap-1 text-[12px] text-blue-400 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                <span>Hải Trần</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <span>01/07/2026 13:39</span>
              </div>
            </div>
          </div>

          {/* Article 4 */}
          <div className="flex gap-4 cursor-pointer group">
            <div className="w-[40%] sm:w-[140px] shrink-0 aspect-[4/3] bg-[#111115] rounded-[8px] overflow-hidden relative bg-gradient-to-br from-teal-900 to-teal-800">
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition duration-300"></div>
            </div>
            <div className="flex-1 flex flex-col justify-start">
              <h4 className="text-[14px] font-bold text-white mb-2 group-hover:text-blue-400 transition line-clamp-3 leading-snug">Top 10 laptop cho sinh viên tự động hóa tốt nhất 2026</h4>
              <div className="flex items-center gap-1 text-[12px] text-blue-400 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                <span>Nguyễn Thư</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <span>30/06/2026 17:20</span>
              </div>
            </div>
          </div>

          {/* Article 5 */}
          <div className="flex gap-4 cursor-pointer group">
            <div className="w-[40%] sm:w-[140px] shrink-0 aspect-[4/3] bg-[#111115] rounded-[8px] overflow-hidden relative bg-gradient-to-br from-yellow-900 to-yellow-800">
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition duration-300"></div>
            </div>
            <div className="flex-1 flex flex-col justify-start">
              <h4 className="text-[14px] font-bold text-white mb-2 group-hover:text-blue-400 transition line-clamp-3 leading-snug">Top 5 laptop cho sinh viên y khoa tốt, đáng mua nhất 2026</h4>
              <div className="flex items-center gap-1 text-[12px] text-blue-400 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                <span>Nguyễn Thư</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <span>30/06/2026 16:00</span>
              </div>
            </div>
          </div>

          {/* Article 6 */}
          <div className="flex gap-4 cursor-pointer group">
            <div className="w-[40%] sm:w-[140px] shrink-0 aspect-[4/3] bg-[#111115] rounded-[8px] overflow-hidden relative bg-gradient-to-br from-gray-700 to-gray-600">
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition duration-300"></div>
            </div>
            <div className="flex-1 flex flex-col justify-start">
              <h4 className="text-[14px] font-bold text-white mb-2 group-hover:text-blue-400 transition line-clamp-3 leading-snug">Đánh giá hiệu năng ASUS VivoBook Go 14: Liệu laptop 8GB RAM có còn đủ cho nhu cầu văn phòng?</h4>
              <div className="flex items-center gap-1 text-[12px] text-blue-400 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                <span>Hải Trần</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <span>30/06/2026 15:58</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>

    {/* RIGHT SIDEBAR (30%) */}
    <div className="lg:w-[30%] space-y-8">
      
      {/* Category Banner */}
      <div className="text-center bg-[#111115] border border-[#1a1a1e] rounded-xl p-6">
        <h3 className="text-2xl font-black text-red-500 uppercase tracking-wide">nổi bật</h3>
        <p className="text-sm text-gray-500 italic mb-6">Tổng hợp các chuyên mục hot</p>
        
        <div className="grid grid-cols-3 gap-y-6 gap-x-2">
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#0a0a0c] rounded-full flex items-center justify-center mx-auto mb-[8px] border border-[#1a1a1e] text-[24px] transition-colors duration-200 group-hover:border-blue-500 text-blue-400">💻</div>
            <p className="text-[11px] font-semibold text-gray-300">MacBook Neo</p>
          </div>
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#0a0a0c] rounded-full flex items-center justify-center mx-auto mb-[8px] border border-[#1a1a1e] text-[24px] transition-colors duration-200 group-hover:border-blue-500 text-purple-400">🧠</div>
            <p className="text-[11px] font-semibold text-gray-300">Xu hướng AI</p>
          </div>
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#0a0a0c] rounded-full flex items-center justify-center mx-auto mb-[8px] border border-[#1a1a1e] text-[24px] transition-colors duration-200 group-hover:border-blue-500 text-green-400">⭐</div>
            <p className="text-[11px] font-semibold text-gray-300">Đánh giá</p>
          </div>
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#0a0a0c] rounded-full flex items-center justify-center mx-auto mb-[8px] border border-[#1a1a1e] text-[24px] transition-colors duration-200 group-hover:border-blue-500 text-yellow-400">🔧</div>
            <p className="text-[11px] font-semibold text-gray-300">Build PC</p>
          </div>
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#0a0a0c] rounded-full flex items-center justify-center mx-auto mb-[8px] border border-[#1a1a1e] text-[24px] transition-colors duration-200 group-hover:border-blue-500 text-red-400">🎮</div>
            <p className="text-[11px] font-semibold text-gray-300">GAME</p>
          </div>
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#0a0a0c] rounded-full flex items-center justify-center mx-auto mb-[8px] border border-[#1a1a1e] text-[24px] transition-colors duration-200 group-hover:border-blue-500 text-cyan-400">🖼️</div>
            <p className="text-[11px] font-semibold text-gray-300">Hình nền</p>
          </div>
        </div>
      </div>

      {/* Bài viết cùng danh mục */}
      <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#1a1a1e] flex items-center gap-2">
          <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
          <h4 className="font-bold text-[14px] text-white uppercase tracking-wide">Cùng danh mục</h4>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-[12px] cursor-pointer group border-b border-[#1a1a1e] pb-4 last:border-b-0 last:pb-0">
            <div className="w-[90px] aspect-video bg-[#1a1a1e] rounded-[6px] relative overflow-hidden bg-gradient-to-r from-blue-900 to-purple-900 shrink-0"></div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition">Theo Silicon Motion: Thị trường SSD bán lẻ gần như biến mất</p>
              <p className="text-[11px] text-gray-500 mt-1">23 hours trước</p>
            </div>
          </div>
          <div className="flex gap-[12px] cursor-pointer group border-b border-[#1a1a1e] pb-4 last:border-b-0 last:pb-0">
            <div className="w-[90px] aspect-video bg-[#1a1a1e] rounded-[6px] relative overflow-hidden bg-gradient-to-r from-green-900 to-blue-900 shrink-0"></div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition">Việt Nam đứng thứ hai trong cuộc đua ứng dụng AI tại ĐNA</p>
              <p className="text-[11px] text-gray-500 mt-1">2 days trước</p>
            </div>
          </div>
          <div className="flex gap-[12px] cursor-pointer group border-b border-[#1a1a1e] pb-4 last:border-b-0 last:pb-0">
            <div className="w-[90px] aspect-video bg-[#1a1a1e] rounded-[6px] relative overflow-hidden bg-gradient-to-r from-cyan-900 to-blue-900 shrink-0"></div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition">SpaceX đưa máy chủ AI lên quỹ đạo: Sải cánh 70m, chip NVIDIA</p>
              <p className="text-[11px] text-gray-500 mt-1">12/06/2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Promo */}
      <div className="w-full aspect-[1/2] bg-gradient-to-b from-red-600 to-red-900 rounded-xl flex flex-col items-center justify-center text-center p-6 border border-red-500/30">
        <p className="text-yellow-300 font-bold text-lg mb-2">GIÁ TỐI THIỂU</p>
        <p className="text-white font-black text-2xl mb-4 leading-tight">HIỆU NĂNG TỐI ĐA</p>
        <div className="bg-yellow-500 text-black px-4 py-1.5 text-xs font-bold rounded-full mb-8">PC BUILD SẴN PHONG VŨ</div>
        
        <div className="w-full bg-white text-black p-4 rounded-lg mb-4 shadow-lg cursor-pointer hover:scale-105 transition-transform">
          <p className="font-bold text-sm">PC VĂN PHÒNG</p>
          <p className="text-[10px] text-gray-500 font-bold mt-1">VOUCHER ĐẾN</p>
          <p className="text-red-600 font-black text-2xl mt-1">500K</p>
        </div>
        
        <div className="w-full bg-white text-black p-4 rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform">
          <p className="font-bold text-sm">PC GAMING</p>
          <p className="text-[10px] text-gray-500 font-bold mt-1">VOUCHER ĐẾN</p>
          <p className="text-red-600 font-black text-2xl mt-1">2 TRIỆU</p>
        </div>
      </div>

    </div>
  </div>

</div>
        <Footer />    
    </>
  );
}
