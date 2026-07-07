'use client';

import { RichTextEditor } from './RichTextEditor';

type Props = {
  product?: any;
  form?: Record<string, any>;
  onChange?: (field: string, value: any) => void;
};

export function TabBasic({ product, form, onChange }: Props) {
  const current = form || product || {};
  const update = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange?.(field, event.target.value);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="col-span-1 md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tên sản phẩm <span className="text-red-500">*</span></label>
          <input value={current.name || current.proName || ''} onChange={update('name')} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 outline-none transition-all shadow-inner" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">SKU <span className="text-red-500">*</span></label>
          <input value={current.sku || current.storeSKU || ''} onChange={update('sku')} maxLength={15} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner font-mono" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Brand ID</label>
          <input value={current.brandId || 0} onChange={update('brandId')} type="number" className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giá bán</label>
          <input value={current.price ?? ''} onChange={update('price')} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-green-400 font-bold focus:border-red-500/50 outline-none transition-all shadow-inner font-mono" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giá thị trường</label>
          <input value={current.marketPrice ?? current.market_price ?? ''} onChange={update('marketPrice')} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-orange-400 font-bold focus:border-red-500/50 outline-none transition-all shadow-inner font-mono" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hiển thị</label>
          <select value={String(current.status ?? current.isOn ?? 1)} onChange={update('status')} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner appearance-none">
            <option value="1">Hiện</option>
            <option value="0">Ẩn</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thứ tự</label>
          <input type="number" value={current.ordering ?? 0} onChange={update('ordering')} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner" />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Slug</label>
          <input value={current.slug || current.url || ''} onChange={update('slug')} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-blue-400 focus:border-red-500/50 outline-none transition-all shadow-inner font-mono" />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Video</label>
          <input value={current.videoCode || current.video_code || ''} onChange={update('videoCode')} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-blue-400 focus:border-red-500/50 outline-none transition-all shadow-inner font-mono" />
        </div>

        <div className="md:col-span-4 space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tóm tắt ngắn</label>
          <textarea rows={6} value={current.summary ?? current.proSummary ?? ''} onChange={update('summary')} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner custom-scrollbar" />
        </div>
      </div>

      <hr className="border-gray-800" />

      <RichTextEditor
        title="Khuyến mãi"
        minHeight="180px"
        value={current.specialOffer || ''}
        onChange={(value) => onChange?.('specialOffer', value)}
      />

      <RichTextEditor
        title="Bảng thông số sản phẩm"
        minHeight="240px"
        value={current.spec || ''}
        onChange={(value) => onChange?.('spec', value)}
      />
    </div>
  );
}

