'use client';

import { Edit, Trash2, ArrowUpDown, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type ArticleNode = {
  id: string;
  title: string;
  url: string;
  publishDate: string;
  author: string;
  views: number;
  updatedAt: string;
  updater: string;
  status: 'Hoạt động' | 'Tạm khóa';
};

const MOCK_ARTICLES: ArticleNode[] = [
  { id: '1', title: 'Top loa vi tính giá rẻ nhỏ gọn đáng mua 2026', url: '#', publishDate: '25-06-2026 11:50:41', author: 'HungND', views: 136, updatedAt: '25-06-2026 13:37:43', updater: 'HungND', status: 'Hoạt động' },
  { id: '2', title: 'Cách kết nối máy in với laptop đơn giản – Hướng dẫn', url: '#', publishDate: '19-06-2026 13:59:54', author: 'HungND', views: 70, updatedAt: '19-06-2026 15:05:40', updater: '', status: 'Hoạt động' },
  { id: '3', title: 'Đánh giá chi tiết Acer Predator Helios Neo 16 PHN16-', url: '#', publishDate: '18-06-2026 14:43:50', author: 'HungND', views: 256, updatedAt: '19-06-2026 09:28:49', updater: 'HungND', status: 'Hoạt động' },
  { id: '4', title: 'Acer Gaming Nitro V 15 ProPanel ANV15-41-R9M1: X1', url: '#', publishDate: '16-06-2026 17:49:19', author: 'HungND', views: 281, updatedAt: '17-06-2026 09:58:57', updater: 'HungND', status: 'Hoạt động' },
  { id: '5', title: 'BẢN TIN CÔNG NGHỆ 16/6/2026', url: '#', publishDate: '16-06-2026 11:55:48', author: 'huyen-1811', views: 58, updatedAt: '16-06-2026 11:55:57', updater: '', status: 'Hoạt động' },
  { id: '6', title: 'UPGRADE NOW WITH NVIDIA - Lên đời RTX 50 Series', url: '#', publishDate: '15-06-2026 16:40:41', author: 'bao-1832', views: 176, updatedAt: '18-06-2026 15:24:09', updater: 'dinh-1347', status: 'Hoạt động' },
  { id: '7', title: 'GIVE AWAY – TRI ÂN FAN CỨNG THÁNG 06', url: '#', publishDate: '15-06-2026 15:13:35', author: 'bao-1832', views: 1076, updatedAt: '17-06-2026 13:41:19', updater: 'dinh-1347', status: 'Hoạt động' },
  { id: '8', title: 'Mua Combo Mainboard GIGABYTE Intel Z890/B860 Se', url: '#', publishDate: '10-06-2026 00:00:00', author: 'TruongDT', views: 71, updatedAt: '', updater: '', status: 'Hoạt động' },
  { id: '9', title: 'BẢN TIN CÔNG NGHỆ 15/6/2026', url: '#', publishDate: '15-06-2026 10:14:43', author: 'huyen-1811', views: 0, updatedAt: '15-06-2026 10:15:22', updater: '', status: 'Hoạt động' },
];

export function ArticleListTable() {
  return (
    <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm relative z-10 flex flex-col h-full">
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse min-w-[1600px]">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-20">
              <th className="p-3 font-bold w-12 text-center"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 cursor-pointer" /></th>
              <th className="p-3 font-bold text-center w-24"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Ảnh <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold min-w-[250px]"><div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Tiêu đề <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold"><div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Đường dẫn</div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Ngày đăng tải <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Người viết <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Lượt xem <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Ngày cập nhật <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Người cập nhật <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Trạng thái <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center w-28">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {MOCK_ARTICLES.map((row) => (
              <tr key={row.id} className="hover:bg-gray-800/30 transition-colors group">
                <td className="p-3 text-center align-middle">
                  <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 checked:border-blue-500 focus:ring-blue-500/30 transition-all cursor-pointer" />
                </td>
                <td className="p-3 text-center align-middle">
                  <div className="w-16 h-10 bg-gray-900 border border-gray-700 rounded overflow-hidden relative mx-auto group-hover:border-blue-500/50 transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAuMB8DtXNJsAAAAASUVORK5CYII=" alt={row.title} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                </td>
                <td className="p-3 font-medium text-gray-200 group-hover:text-blue-400 transition-colors cursor-pointer leading-relaxed align-middle">{row.title}</td>
                <td className="p-3 align-middle">
                  <a href={row.url} className="text-blue-400 hover:text-blue-300 hover:underline transition-colors text-xs whitespace-nowrap">Xem trang bài viết</a>
                </td>
                <td className="p-3 text-center font-mono text-gray-400 align-middle whitespace-nowrap">{row.publishDate}</td>
                <td className="p-3 text-center text-gray-300 align-middle">{row.author}</td>
                <td className="p-3 text-center align-middle">
                   <span className="font-bold text-red-500">{row.views > 0 ? row.views : ''}</span>
                </td>
                <td className="p-3 text-center font-mono text-gray-400 align-middle whitespace-nowrap">{row.updatedAt}</td>
                <td className="p-3 text-center text-gray-300 align-middle">{row.updater}</td>
                <td className="p-3 text-center align-middle">
                   <div className="flex items-center justify-center gap-2">
                     <div className="relative inline-block w-8 h-4 cursor-pointer">
                        <input type="checkbox" className="peer sr-only" defaultChecked={row.status === 'Hoạt động'} />
                        <div className="w-8 h-4 bg-gray-700 rounded-full peer peer-checked:bg-blue-500 transition-colors"></div>
                        <div className="absolute left-1 top-0.5 w-3 h-3 bg-white rounded-full peer-checked:translate-x-4 transition-transform"></div>
                     </div>
                     <span className="text-gray-300 text-xs">{row.status}</span>
                   </div>
                </td>
                <td className="p-3 text-center align-middle">
                  <div className="flex items-center justify-center gap-1.5">
                    <button className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 bg-blue-950/30 border border-blue-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]" title="Xem trên web"><ExternalLink className="w-3.5 h-3.5" /></button>
                    <Link href={`/article/edit`}>
                      <button className="p-1.5 text-green-400 hover:text-white hover:bg-green-600 bg-green-950/30 border border-green-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.5)]" title="Chỉnh sửa"><Edit className="w-3.5 h-3.5" /></button>
                    </Link>
                    <button className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.5)]" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 bg-gray-950/50 border-t border-gray-800 flex flex-wrap items-center justify-between gap-4 text-sm mt-auto">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-mono text-xs uppercase tracking-wider">Số hàng hiển thị</span>
          <select className="bg-gray-900 border border-gray-700 rounded-sm px-2 py-1 text-gray-300 focus:outline-none focus:border-blue-500/50">
            <option>20</option>
            <option>50</option>
            <option>100</option>
          </select>
        </div>
        
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">|&lt;</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">&lt;</button>
          
          <button className="w-8 h-8 flex items-center justify-center border border-blue-500 bg-blue-500/20 text-blue-400 rounded-sm font-bold shadow-[0_0_10px_rgba(59,130,246,0.2)]">1</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors">2</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors">3</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors">4</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors">5</button>
          <span className="px-2 text-gray-600">...</span>
          <button className="w-10 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors font-mono">178</button>
          
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">&gt;</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">&gt;|</button>
        </div>
      </div>
    </div>
  );
}
