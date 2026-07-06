import { RichTextEditor } from '@/components/products/edit/RichTextEditor';
import { Save, X, Check } from 'lucide-react';
import Link from 'next/link';

export default function ArticleCategoryEditPage() {
  return (
    <div className="w-full h-full p-2 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar relative">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-20 py-2 border-b border-gray-800/50">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 flex items-center gap-3">
          <span className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
          Chỉnh sửa danh mục bài viết
        </h1>
        <div className="flex gap-3">
          <Link href="/news/news-category">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300 rounded-md transition-all">
              <X className="w-4 h-4" /> Đóng
            </button>
          </Link>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]">
            <Save className="w-4 h-4" /> Lưu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 w-full h-full pb-20 mt-6">
        <div className="glass-panel p-8 rounded-lg border border-gray-800/50 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Tên danh mục bài viết <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="Nhập tên" 
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Trạng thái</label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner">
                <option value="">Trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Không hoạt động</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Link danh mục bài viết <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              placeholder="Nhập link danh mục bài viết" 
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner font-mono text-sm" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Tóm tắt</label>
            <input 
              type="text" 
              placeholder="Nhập tóm tắt" 
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner" 
            />
          </div>

          <div className="pt-2">
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Mô tả chi tiết (nếu có)
            </label>
            <div className="border border-gray-700 rounded-md overflow-hidden bg-gray-900">
              <RichTextEditor 
                id="article-category-description"
                title=""
                defaultValue=""
                minHeight="250px"
              />
              <div className="px-3 py-2 border-t border-gray-800 text-xs text-gray-500 flex justify-between bg-gray-950/50">
                <span>Press Alt+0 for help</span>
                <span>Số kí tự: 0 từ</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <label className="text-sm font-medium text-gray-300">
              Là danh mục con của :
            </label>
            <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner">
              <option value="">Chọn danh mục cha</option>
              <option value="1">Tin khuyến mại</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Loại nội dung hiển thị</label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner">
                <option value="">Chọn loại nội dung</option>
                <option value="1">Hiển thị bài + Danh mục con</option>
                <option value="2">Chỉ hiển thị bài</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Thứ tự xuất hiện (cao xếp trước)</label>
              <input 
                type="number" 
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner" 
              />
            </div>
          </div>

          {/* SEO Section */}
          <div className="pt-6 border-t border-gray-800/50 mt-8">
            <h3 className="text-md font-bold text-gray-200 mb-6 flex items-center gap-2 uppercase tracking-wide">
              <span className="w-1 h-4 bg-green-500 rounded-full"></span> Dùng cho SEO
            </h3>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Meta Title <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Meta Keyword <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Meta Description <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner" 
                />
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-8 flex justify-center items-center gap-4">
            <button className="flex items-center justify-center gap-2 px-8 py-2.5 bg-transparent text-blue-400 border border-blue-500/50 hover:bg-blue-500/10 rounded-md transition-all font-medium min-w-[120px]">
              <Check className="w-4 h-4" /> Lưu
            </button>
            <Link href="/news/news-category">
              <button className="flex items-center justify-center gap-2 px-8 py-2.5 bg-transparent text-red-400 border border-red-500/50 hover:bg-red-500/10 rounded-md transition-all font-medium min-w-[120px]">
                <X className="w-4 h-4" /> Đóng
              </button>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
