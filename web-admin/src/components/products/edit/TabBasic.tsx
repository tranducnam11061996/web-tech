'use client';

import { RichTextEditor } from './RichTextEditor';

/**
 * Extract video URLs from PHP serialized string.
 * Input: 'a:1:{i:0;a:2:{s:3:"url";s:43:"https://www.youtube.com/watch?v=xxx";s:11:"description";...}}'
 * Output: 'https://www.youtube.com/watch?v=xxx'
 * Multiple URLs are separated by ';'
 */
function extractVideoUrls(raw: string): string {
  if (!raw) return '';
  const matches = raw.match(/https?:\/\/[^"';\s]+/g);
  if (!matches || matches.length === 0) return raw;
  return matches.join(' ; ');
}

/**
 * Format number with dot thousand separators (Vietnamese style).
 * Example: 13999000 → '13.999.000'
 */
function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '' || value === 0) return '';
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num)) return String(value);
  return num.toLocaleString('vi-VN');
}

export function TabBasic({ product }: { product?: any }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Product Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Row 1: Tên sản phẩm | Mã sản phẩm | Chọn thương hiệu */}
        <div className="col-span-1 md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tên sản phẩm <span className="text-red-500">*</span></label>
          <input type="text" defaultValue={product?.proName || ''} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 outline-none transition-all shadow-inner" />
        </div>
        <div className="col-span-1 md:col-span-1 space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mã sản phẩm</label>
          <input type="text" defaultValue={product?.storeSKU || ''} disabled className="w-full bg-gray-950/50 border border-gray-800 rounded-sm px-3 py-2 text-sm text-gray-500 cursor-not-allowed font-mono" />
        </div>
        <div className="col-span-1 md:col-span-1 space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Chọn thương hiệu <span className="text-red-500">*</span></label>
          <select disabled className="w-full bg-gray-950/50 border border-gray-800 rounded-sm px-3 py-2 text-sm text-gray-500 cursor-not-allowed appearance-none">
            <option>{product?.brandName || 'N/A'}</option>
          </select>
        </div>

        {/* Row 2: Giá HSSV | Giá thị trường | Hiển thị | Số thứ tự hiển thị */}
        <div className="col-span-1 md:col-span-1 space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giá HSSV/Giá khoảng từ - đến</label>
          <input type="text" defaultValue={formatPrice(product?.price)} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-green-400 font-bold focus:border-red-500/50 outline-none transition-all shadow-inner font-mono" />
        </div>
        <div className="col-span-1 md:col-span-1 space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giá thị trường</label>
          <input type="text" defaultValue={formatPrice(product?.market_price)} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-orange-400 font-bold focus:border-red-500/50 outline-none transition-all shadow-inner font-mono" />
        </div>
        <div className="col-span-1 md:col-span-1 space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hiển thị</label>
          <select defaultValue={product?.isOn ? 'Hiện' : 'Ẩn'} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner appearance-none">
            <option value="Hiện">Hiện</option>
            <option value="Ẩn">Ẩn</option>
          </select>
        </div>
        <div className="col-span-1 md:col-span-1 space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Số thứ tự hiển thị</label>
          <input type="number" defaultValue={product?.ordering || 0} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner" />
        </div>

        {/* Row 3: Link video sản phẩm | Tên mô tả ngắn sản phẩm | HighlightClass */}
        <div className="col-span-1 md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Link video sản phẩm</label>
          <input type="text" defaultValue={extractVideoUrls(product?.video_code || '')} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-blue-400 focus:border-red-500/50 outline-none transition-all shadow-inner font-mono" />
        </div>
        <div className="col-span-1 md:col-span-1 space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tên mô tả ngắn sản phẩm</label>
          <input type="text" defaultValue="" className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner" />
        </div>
        <div className="col-span-1 md:col-span-1 space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">HighlightClass</label>
          <input type="text" defaultValue="" className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-yellow-400 focus:border-red-500/50 outline-none transition-all shadow-inner font-mono" />
        </div>

        <div className="col-span-1 md:col-span-4 space-y-2 mb-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Note - Lưu ý</label>
          <textarea 
            rows={5}
            className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner custom-scrollbar" 
            defaultValue=""
          />
        </div>
      </div>

      <hr className="border-gray-800" />

      {/* Thông số ngắn & Khuyến mãi (moved from Description tab) */}
      <div className="space-y-6">
        <RichTextEditor 
          title="Khuyến mãi (web)" 
          minHeight="150px"
          defaultValue={product?.specialOffer || ''}
        />

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thông số ngắn</label>
          <textarea 
            rows={6}
            className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner custom-scrollbar" 
            defaultValue={product?.proSummary || ''}
          />
        </div>

        <RichTextEditor 
          title="Bảng thông số sản phẩm" 
          minHeight="200px"
          defaultValue={product?.spec || ''}
        />
      </div>
    </div>
  );
}
