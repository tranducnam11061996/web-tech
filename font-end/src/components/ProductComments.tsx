import React from 'react';

export default function ProductComments() {
  return (
    <div className="card-box">
      <h3 className="font-bold text-lg text-white mb-4">Bình luận sản phẩm</h3>
      <label htmlFor="product-comment" className="sr-only">Bình luận sản phẩm</label>
      <textarea id="product-comment" disabled aria-describedby="product-comments-unavailable" className="w-full cursor-not-allowed bg-[#0d0d10] border border-[#27272a] rounded-lg p-4 text-sm text-gray-500 min-h-[120px] mb-4 resize-y opacity-60" placeholder="Chia sẻ câu hỏi hoặc nhận xét của bạn về sản phẩm"></textarea>
      <p id="product-comments-unavailable" className="mb-4 text-xs text-amber-300">Tính năng bình luận đang được phát triển.</p>
      <div className="flex justify-between items-center">
        <button type="button" disabled aria-describedby="product-comments-unavailable" className="cursor-not-allowed text-gray-600 text-sm font-medium flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Đính kèm ảnh
        </button>
        <button type="button" disabled aria-describedby="product-comments-unavailable" className="cursor-not-allowed bg-gray-700 text-gray-400 text-sm font-bold px-6 py-2.5 rounded-md opacity-70">Gửi bình luận</button>
      </div>
    </div>
  );
}
