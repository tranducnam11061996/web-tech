import { RichTextEditor } from '@/components/products/edit/RichTextEditor';
import { Save, X, Image as ImageIcon, Upload } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function CategoryEditPage() {
  return (
    <div className="w-full h-full p-2 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar relative">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-20 py-2 border-b border-gray-800/50">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500 flex items-center gap-3">
          <span className="w-1.5 h-6 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
          Chỉnh sửa danh mục sản phẩm
        </h1>
        <div className="flex gap-3">
          <Link href="/products/categories">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300 rounded-md transition-all">
              <X className="w-4 h-4" /> Đóng danh mục
            </button>
          </Link>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]">
            <Save className="w-4 h-4" /> Sửa danh mục
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-[1200px] mx-auto pb-20">
        
        {/* Section 1: Thông tin cơ bản */}
        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-5">
          <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full"></span> Thông tin cơ bản
          </h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Tên danh mục: <span className="text-red-500">*</span></label>
              <input type="text" defaultValue="Laptop, Tablet, Surface" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Mã danh mục: <span className="text-red-500">*</span></label>
              <input type="text" defaultValue="693" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300">URL</label>
            <input type="text" defaultValue="/laptop-tablet-mobile" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Nổi bật <span className="text-red-500">*</span></label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50">
                <option>Nổi bật</option>
                <option>Không</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Trạng thái <span className="text-red-500">*</span></label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50">
                <option>Hiện</option>
                <option>Ẩn</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Là danh mục con của:</label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50">
                <option>Chọn danh mục cha...</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Loại nội dung hiển thị: <span className="text-red-500">*</span></label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50">
                <option>Hiển thị sản phẩm + Danh mục con</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 items-center bg-gray-900/30 p-4 rounded-md border border-gray-800">
            <div className="col-span-4 space-y-1">
              <label className="text-sm font-medium text-gray-300 block">Là danh mục sản phẩm hay SEO <span className="text-red-500">*</span></label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50">
                <option>Category</option>
              </select>
            </div>
            <div className="col-span-4 flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-red-500 focus:ring-red-500" />
              <label className="text-sm text-gray-300">Dùng làm danh mục build pc</label>
            </div>
            <div className="col-span-4 flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-red-500 focus:ring-red-500" />
              <label className="text-sm text-gray-300">Dùng làm mega menu</label>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Thứ tự xuất hiện (cao xếp trước):</label>
              <input type="number" defaultValue="35" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Template File:</label>
              <input type="text" placeholder="Template File..." className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-red-500 focus:ring-red-500" />
              <label className="text-sm text-gray-300">Hiển thị danh mục này trong homepage</label>
            </div>
          </div>
        </div>

        {/* Section 2: Hình ảnh & Mô tả */}
        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-5">
          <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-purple-500 rounded-full"></span> Hình ảnh & Thông tin thêm
          </h2>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Ảnh icon</label>
              <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-md p-1">
                <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded text-xs truncate flex-1">tablet_0904.png</span>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs transition-colors flex items-center gap-1"><Upload className="w-3 h-3"/> Tải lên</button>
              </div>
              <div className="h-40 border border-dashed border-gray-700 rounded-md flex flex-col items-center justify-center bg-gray-950/50 group hover:border-red-500/50 transition-colors">
                <ImageIcon className="w-10 h-10 text-gray-600 group-hover:text-red-500/50 mb-2" />
                <span className="text-xs text-gray-500">Ảnh icon hiện tại</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Ảnh đại diện</label>
              <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-md p-1">
                <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded text-xs truncate flex-1">Banner-Laptop-VP.png</span>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs transition-colors flex items-center gap-1"><Upload className="w-3 h-3"/> Tải lên</button>
              </div>
              <div className="h-40 border border-dashed border-gray-700 rounded-md flex flex-col items-center justify-center bg-gray-950/50 group hover:border-red-500/50 transition-colors">
                <ImageIcon className="w-10 h-10 text-gray-600 group-hover:text-red-500/50 mb-2" />
                <span className="text-xs text-gray-500">Ảnh đại diện hiện tại</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-200 flex items-center gap-2 mb-2 uppercase tracking-widest"><span className="w-1 h-4 bg-red-500 rounded-full inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>Mô tả (nếu có):</label>
            <textarea className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50 min-h-[120px]" />
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-200 flex items-center gap-2 mb-2 uppercase tracking-widest"><span className="w-1 h-4 bg-red-500 rounded-full inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>Từ khóa (tags, nếu có - nhập mỗi cụm từ 1 dòng)</label>
            <textarea className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50 min-h-[120px]" />
          </div>
        </div>

        {/* Section 3: Cấu hình bổ sung */}
        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-5">
          <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-green-500 rounded-full"></span> Cấu hình bổ sung
          </h2>
          
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-200 flex items-center gap-2 mb-2 uppercase tracking-widest"><span className="w-1 h-4 bg-red-500 rounded-full inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>Khoảng lọc giá:</label>
            <textarea 
              defaultValue="1000000;15000000;20000000;25000000;30000000;35000000;40000000;45000000;50000000;60000000;70000000;80000000;" 
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50 min-h-[100px]"
            />
            <p className="text-xs text-gray-500 italic mt-2">(Nhập từng giá cách nhau dấu ;) ví dụ: 300000;800000;1500000 có nghĩa là tạo ra 4 khoảng giá cho khách hàng lọc Sản phẩm. Đó là: - Dưới 300000, - Từ 300000 đến 800000, - Từ 800000 đến 1500000 và - Trên 1500000</p>
          </div>

          <div className="pt-4 border-t border-gray-800">
            <RichTextEditor 
              title="Nhập nội dung:" 
              defaultValue="<p>HACOM với tuổi đời thành lập từ năm 2001, tạo dựng nên thương hiệu phân phối bán lẻ máy tính hàng đầu tại thị trường Việt Nam...</p>"
              minHeight="400px"
              id="category-content"
            />
          </div>
        </div>

        {/* Section 4: Cấu hình liên kết & SEO */}
        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-5">
          <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-yellow-500 rounded-full"></span> Cấu hình Liên kết & SEO
          </h2>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Thay đổi liên kết</label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50">
                <option>Bật/Tắt</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Số thứ tự hiển thị:</label>
              <input type="text" placeholder="Số thứ tự hiển thị..." className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Redirect tới URL (khi truy cập danh mục sẽ chuyển sang link này):</label>
              <input type="text" placeholder="URL..." className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Số Sản phẩm hiển thị (để = 0 nếu mặc định theo hệ thống cài đặt chung):</label>
              <input type="number" defaultValue="0" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-gray-800 space-y-5">
            <h3 className="text-md font-bold text-gray-300">Dùng cho SEO</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Index for SEO:</label>
                <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50">
                  <option>Index...</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Link SEO (alias):</label>
                <input type="text" defaultValue="laptop-tablet-mobile" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Meta Title <span className="text-gray-500 font-normal">0 ký tự, 0 từ :</span> <span className="text-red-500">*</span></label>
              <input type="text" defaultValue="Laptop, máy tính xách tay, máy tính bảng chính hãng | HACOM" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-200 flex items-center gap-2 mb-2 uppercase tracking-widest"><span className="w-1 h-4 bg-red-500 rounded-full inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>Meta Keyword 14 ký tự, 77 từ : *</label>
                <textarea 
                  defaultValue="laptop, tablet, surface, máy tính bảng, máy tính xách tay, máy tính, đồng hồ," 
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50 min-h-[120px]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-200 flex items-center gap-2 mb-2 uppercase tracking-widest"><span className="w-1 h-4 bg-red-500 rounded-full inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>Meta Description 0 ký tự, 0 từ : *</label>
                <textarea 
                  defaultValue="HACOM phân phối chính hãng các dòng sản phẩm laptop, tablet, máy tính xách tay, máy tính bảng, đồng hồ,... chính hãng, hỗ trợ trả góp 0% tháng. Xem ngay!" 
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50 min-h-[120px]"
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
