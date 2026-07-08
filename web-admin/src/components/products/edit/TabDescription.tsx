'use client';

import { RichTextEditor } from './RichTextEditor';

export function TabDescription({
  product,
  form,
  onChange,
}: {
  product?: any;
  form?: Record<string, any>;
  onChange?: (field: string, value: any) => void;
}) {
  const current = form || product || {};
  const description = current.description || '';
  const metaTitle = current.metaTitle ?? current.meta_title ?? '';
  const metaKeyword = current.metaKeyword ?? current.meta_keyword ?? '';
  const metaDescription = current.metaDescription ?? current.meta_description ?? '';
  const wordCount = (value: unknown) => String(value || '').trim().split(/\s+/).filter(Boolean).length;
  const charCount = (value: unknown) => String(value || '').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="space-y-2 border border-gray-800 rounded-sm p-4 bg-gray-950/30">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-4 bg-red-500 rounded-full inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
            Bài viết giới thiệu sản phẩm
          </h3>
          <div className="flex gap-2">
            <button type="button" className="px-3 py-1 text-xs font-bold text-blue-400 border border-blue-900 rounded-sm hover:bg-blue-900/30 transition-colors uppercase tracking-wider">Tải ảnh lên</button>
            <button type="button" className="px-3 py-1 text-xs font-bold text-green-400 border border-green-900 rounded-sm hover:bg-green-900/30 transition-colors uppercase tracking-wider">Kho ảnh có sẵn</button>
          </div>
        </div>

        <RichTextEditor
          title=""
          minHeight="440px"
          defaultValue={description}
          onChange={(value) => onChange?.('description', value)}
          resizable
        />
      </div>

      <hr className="border-gray-800" />

      <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-6 bg-red-500 rounded-full inline-block shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
          Dùng cho SEO
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Meta Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={metaTitle}
              onChange={(event) => onChange?.('metaTitle', event.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner"
            />
            <div className="text-[10px] text-gray-500 font-mono">Số từ: {wordCount(metaTitle)}, Số ký tự: {charCount(metaTitle)}</div>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Meta Keyword <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={metaKeyword}
              onChange={(event) => onChange?.('metaKeyword', event.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner"
            />
            <div className="text-[10px] text-gray-500 font-mono">Số từ: {wordCount(metaKeyword)}, Số ký tự: {charCount(metaKeyword)}</div>
          </div>

          <div className="col-span-1 md:col-span-4 space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Meta Description</label>
            <textarea
              rows={5}
              value={metaDescription}
              onChange={(event) => onChange?.('metaDescription', event.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-sm px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 outline-none transition-all shadow-inner custom-scrollbar resize-y min-h-[100px]"
            />
            <div className="text-[10px] text-gray-500 font-mono">Số từ: {wordCount(metaDescription)}, Số ký tự: {charCount(metaDescription)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
