'use client';

import { RichTextEditor } from './RichTextEditor';

export function TabDescription({ product }: { product?: any }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Bài viết giới thiệu sản phẩm */}
      <div className="space-y-2 border border-gray-800 rounded-sm p-4 bg-gray-950/30">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-4 bg-red-500 rounded-full inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
            Bài viết giới thiệu sản phẩm
          </h3>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs font-bold text-blue-400 border border-blue-900 rounded-sm hover:bg-blue-900/30 transition-colors uppercase tracking-wider">Tải ảnh lên</button>
            <button className="px-3 py-1 text-xs font-bold text-green-400 border border-green-900 rounded-sm hover:bg-green-900/30 transition-colors uppercase tracking-wider">Kho ảnh có sẵn</button>
          </div>
        </div>
        
        <RichTextEditor 
          title="" 
          minHeight="400px"
          defaultValue={product?.description || ''}
        />
      </div>

      <hr className="border-gray-800" />

      {/* SEO Section (moved from Basic tab) */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-6 bg-red-500 rounded-full inline-block shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
          Dùng cho SEO
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Url index <span className="text-red-500">*</span></label>
            <input type="text" defaultValue="laptop-msi-katana-15-b13vfk-676vn-i7-13620h-rtx-4060-8gb-144hz-chinh-hang" className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-blue-400 focus:border-red-500/50 outline-none transition-all shadow-inner font-mono" />
          </div>
          <div className="col-span-1 md:col-span-1 space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Index</label>
            <select className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner appearance-none">
              <option>Index</option>
              <option>No Index</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-1 space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Follow</label>
            <select className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner appearance-none">
              <option>Follow</option>
              <option>No Follow</option>
            </select>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Meta Title <span className="text-red-500">*</span></label>
            <input type="text" defaultValue="MSI Katana 15 B13VFK-676VN i7-13620H - RTX 4060 - SSD 1TB - RAM 16GB - 144Hz Siêu HOT" className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner" />
            <div className="text-[10px] text-gray-500 font-mono">Số từ: 18, Số ký tự: 85</div>
          </div>
          <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Meta Keyword <span className="text-red-500">*</span></label>
            <input type="text" defaultValue="Laptop MSI Gaming Katana 15 B13VFK 676VN, MSI Katana 15 B13VFK 676VN" className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner" />
            <div className="text-[10px] text-gray-500 font-mono">Số từ: 12, Số ký tự: 68</div>
          </div>

          <div className="col-span-1 md:col-span-4 space-y-2">
            <RichTextEditor 
              title="Meta Description" 
              minHeight="100px"
              defaultValue="Sở hữu MSI Katana 15 B13VFK-676VN i7-13620H RTX 4060 8GB, màn 144Hz siêu mượt. Laptop gaming hiệu năng cao, tối ưu FPS, chiến game & làm đồ họa ổn định..."
            />
            <div className="text-[10px] text-gray-500 font-mono">Số từ: 30, Số ký tự: 153</div>
          </div>
        </div>
      </div>
    </div>
  );
}
