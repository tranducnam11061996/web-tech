import React from 'react';

export default function ProductComments() {
  return (
    <div className="card-box">
      <h3 className="font-bold text-lg text-white mb-4">Bình luận sản phẩm</h3>
      <textarea className="w-full bg-[#0d0d10] border border-[#27272a] rounded-lg p-4 text-sm text-gray-300 focus:outline-none focus:border-blue-500 transition min-h-[120px] mb-4 resize-y" placeholder="Chia sẻ câu hỏi hoặc nhận xét của bạn về sản phẩm"></textarea>
      <div className="flex justify-between items-center">
        <button className="text-blue-500 text-sm font-medium hover:underline flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Đính kèm ảnh
        </button>
        <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-2.5 rounded-md transition">Gửi bình luận</button>
      </div>
    </div>
  );
}
