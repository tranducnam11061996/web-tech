import React from "react";
import Link from "next/link";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import ProgressiveImage from "../../../components/ProgressiveImage";
import CategorySidebar from "../../../components/CategorySidebar";

export default function CategoryView({ category, categoryNews, formatDate, page, totalNews }: { category: any, categoryNews: any[], formatDate: (d: string) => string, page?: number, totalNews?: number }) {
    
    const itemsPerPage = 21;
    const totalPages = totalNews ? Math.ceil(totalNews / itemsPerPage) : Math.ceil(categoryNews.length / itemsPerPage);
    const currentPage = page || 1;
    const currentItems = categoryNews;

    const topNews = currentPage === 1 ? currentItems.slice(0, 3) : [];
    const remainingNews = currentPage === 1 ? currentItems.slice(3) : currentItems;

    return (
      <>     
        <Header />
        <div className="max-w-[1400px] mx-auto px-4 py-8 space-y-8 bg-[#0a0a0c]">
          
          {/* Breadcrumb */}
          <nav className="flex text-[13px] text-gray-400 gap-2 items-center mb-4 overflow-hidden">
            <Link href="/" className="hover:text-blue-500 transition flex items-center gap-1 shrink-0 whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Trang chủ
            </Link>
            <span className="text-gray-600 shrink-0">/</span>
            <Link href="/tin-tuc" className="hover:text-blue-500 transition shrink-0 whitespace-nowrap">Tin tức</Link>
            <span className="text-gray-600 shrink-0">/</span>
            <span className="text-white font-bold truncate min-w-0">{category.name || "Danh mục"}</span>
          </nav>

          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 mb-8 border-b border-[#1a1a1e]">
            <div className="max-w-2xl">
               <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 uppercase tracking-tight mb-3 leading-tight">{category.name || "TIN TỨC"}</h1>
               <p className="text-gray-400 text-[15px] leading-relaxed">{category.description || "Cập nhật xu hướng công nghệ mới nhất, đánh giá phần cứng chuyên sâu và phân tích thị trường chuẩn xác."}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0 mb-1">
               <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Chia sẻ:</span>
               <button className="w-8 h-8 rounded-full bg-[#111115] border border-[#2a2a32] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#1877F2] hover:border-[#1877F2] transition">
                 <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
               </button>
               <button className="w-8 h-8 rounded-full bg-[#111115] border border-[#2a2a32] flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 hover:border-gray-700 transition">
                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
               </button>
            </div>
          </div>

          {/* TOP 3 NEWS - FULL WIDTH */}
          {topNews.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:auto-rows-[420px] mb-10">
              {topNews.map((newsItem, index) => {
                const isBig = index === 0;
                const badgeText = index === 0 ? "TIÊU ĐIỂM" : index === 1 ? "HOT" : "PHÂN TÍCH";
                const badgeColor = index === 0 ? "bg-blue-600" : index === 1 ? "bg-red-600" : "bg-green-600";
                const fallbackGradient = index === 0 ? "from-blue-900 to-blue-800" : index === 1 ? "from-red-900 to-red-800" : "from-green-900 to-green-800";
                
                return (
                  <Link href={`/tin-tuc/${newsItem.url}`} key={newsItem.id} className={`relative group overflow-hidden rounded-[16px] flex flex-col justify-end ${isBig ? 'lg:col-span-2' : 'lg:col-span-1'} min-h-[350px]`}>
                    {/* Background Image / Gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient} z-0`}></div>
                    {newsItem.thumnail && (
                      <ProgressiveImage 
                        src={`https://hacom.vn/media/news/${newsItem.thumnail}`} 
                        alt={newsItem.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 z-0"
                      />
                    )}
                    {/* Gradient Overlay for Text Visibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/50 to-transparent z-10"></div>
                    
                    {/* Content */}
                    <div className="relative z-20 p-8">
                      <span className={`${badgeColor} text-white text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-5 inline-block`}>
                        {badgeText}
                      </span>
                      <h3 className={`font-bold text-white mb-4 group-hover:text-blue-400 transition leading-tight ${isBig ? 'text-3xl md:text-[34px]' : 'text-xl md:text-[22px]'}`}>
                        {newsItem.title}
                      </h3>
                      {isBig && (
                        <p className="text-gray-300 text-base line-clamp-2 mb-6 leading-relaxed max-w-2xl">{newsItem.summary}</p>
                      )}
                      <div className="flex items-center gap-5 text-[13px] text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                          <span>{newsItem.createBy === 1 ? "Admin" : "Author"}</span>
                        </div>
                        {isBig && (
                          <div className="flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                            <span>{formatDate(newsItem.createDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* MAIN CONTENT SPLIT (70% - 30%) */}
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-[70%] space-y-10">
              {/* REMAINING NEWS LIST */}
              {remainingNews.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                  {remainingNews.map((newsItem) => (
                    <Link href={`/tin-tuc/${newsItem.url}`} key={newsItem.id} className="group flex flex-col bg-transparent cursor-pointer">
                      <div className="relative w-full aspect-[16/10] rounded-[16px] overflow-hidden mb-5 bg-[#111115]">
                        {newsItem.thumnail ? (
                          <ProgressiveImage 
                            src={`https://hacom.vn/media/news/${newsItem.thumnail}`} 
                            alt={newsItem.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-bold text-xl">NO IMAGE</div>
                        )}
                        <span className="absolute top-3 left-3 bg-[#111115]/80 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider border border-[#2a2a32] z-10">
                          {newsItem.category_name || category.name || "TIN TỨC"}
                        </span>
                      </div>
                      
                      <h3 className="text-[18px] font-bold text-white mb-3 group-hover:text-blue-400 transition leading-snug">
                        {newsItem.title}
                      </h3>
                      <p className="text-sm text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                        {newsItem.summary}
                      </p>
                      
                      <div className="flex items-center justify-between text-[12px] text-gray-500 mt-auto pt-2">
                        <div className="flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                          <span>{newsItem.createBy === 1 ? "Admin" : "Author"}</span>
                        </div>
                        <div>{formatDate(newsItem.createDate)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {categoryNews.length === 0 && (
                <div className="py-20 text-center text-gray-500 bg-[#111115] rounded-xl border border-[#1a1a1e]">
                  Chưa có bài viết nào trong danh mục này.
                </div>
              )}

              {totalPages > 0 && (
                <div className="flex items-center justify-center gap-2 mt-12 pt-8 border-t border-[#1a1a1e]">
                  {currentPage > 1 && (
                    <Link href={`?page=${currentPage - 1}`} className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#111115] border border-[#2a2a32] text-gray-400 hover:text-white hover:border-blue-500 transition">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                    </Link>
                  )}
                  
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const p = i + 1;
                    if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
                      return (
                        <Link key={p} href={`?page=${p}`} className={`w-10 h-10 flex items-center justify-center rounded-lg border transition ${p === currentPage ? 'bg-blue-600 border-blue-600 text-white font-bold' : 'bg-[#111115] border-[#2a2a32] text-gray-400 hover:text-white hover:border-blue-500'}`}>
                          {p}
                        </Link>
                      );
                    }
                    if (p === currentPage - 2 || p === currentPage + 2) {
                      return <span key={p} className="text-gray-500 px-1">...</span>;
                    }
                    return null;
                  })}

                  {currentPage < totalPages && (
                    <Link href={`?page=${currentPage + 1}`} className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#111115] border border-[#2a2a32] text-gray-400 hover:text-white hover:border-blue-500 transition">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </Link>
                  )}
                </div>
              )}

            </div>
            
            <CategorySidebar />
          </div>
        </div>
        <Footer />    
      </>
    );
}
