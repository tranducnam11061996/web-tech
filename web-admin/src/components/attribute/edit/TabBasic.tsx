'use client';

import { Plus, X } from 'lucide-react';
import type { AttributeFormData, AttributeValueForm } from '@/lib/admin/attributeTypes';
import { createAttributeValueApiKey } from '@/lib/attributeValueApiKey';

type Props = {
  form: AttributeFormData;
  onChange: React.Dispatch<React.SetStateAction<AttributeFormData>>;
  onRequestDeleteValue: (value: AttributeValueForm) => void;
};

export function TabBasic({ form, onChange, onRequestDeleteValue }: Props) {
  const patch = (value: Partial<AttributeFormData>) => onChange((current) => ({ ...current, ...value }));
  const updateValue = (index: number, value: Partial<AttributeValueForm>) => onChange((current) => ({
    ...current,
    values: current.values.map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item),
  }));
  const addValue = () => onChange((current) => ({
    ...current,
    values: [...current.values, { value: '', apiKey: '', image: '', description: '', ordering: current.values.length, valueSort: 0, productCount: 0 }],
  }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Tên thuộc tính: <span className="text-red-500">*</span></label>
          <input type="text" value={form.name} onChange={(event) => patch({ name: event.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Mã thuộc tính: <span className="text-red-500">*</span></label>
          <input type="text" value={form.code} onChange={(event) => patch({ code: event.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Mô tả tóm tắt (nếu muốn hiển thị và giải thích ý nghĩa cho khách hàng)</label>
          <textarea rows={3} value={form.comment} onChange={(event) => patch({ comment: event.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-y" />
        </div>
      </div>

      <div className="space-y-3 p-4 border border-gray-800 rounded bg-gray-900/30">
        <h3 className="font-semibold text-gray-200 border-b border-gray-800 pb-2 mb-3">Lựa chọn áp dụng</h3>
        {[
          ['isHeader', 'Dùng là tiêu đề nhóm cho các thuộc tính đứng sau'],
          ['isSearch', 'Dùng lọc Sản phẩm ở danh mục'],
          ['inSummary', 'Hiển thị ở thông tin tóm tắt Sản phẩm'],
          ['productSpec', 'Hiển thị ở bảng thông số kỹ thuật'],
          ['forProductOption', 'Dùng để tạo các cấu hình của Sản phẩm'],
        ].map(([field, label]) => (
          <label key={field} className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" checked={Boolean(form[field as keyof AttributeFormData])} onChange={(event) => patch({ [field]: event.target.checked } as Partial<AttributeFormData>)} className="w-4 h-4 rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 focus:ring-blue-500/30" />
            <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">{label}</span>
          </label>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Mã bộ lọc trên Url (v.d. cpu (trên link lọc ?cpu=32Ghz&amp;ram=32GB)):</label>
          <input type="text" value={form.filterCode} onChange={(event) => patch({ filterCode: event.target.value })} placeholder="Nhập mã bộ lọc..." className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Phân loại <span className="text-red-500">*</span></label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="radio" name="classification" checked={form.scope === 0} onChange={() => patch({ scope: 0 })} className="w-4 h-4 text-blue-500 bg-gray-900 border-gray-700 focus:ring-blue-500/30" />
              <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors"><span className="font-semibold text-gray-300">Local</span> - Chỉ áp dụng cho một số loại Sản phẩm</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="radio" name="classification" checked={form.scope === 1} onChange={() => patch({ scope: 1 })} className="w-4 h-4 text-blue-500 bg-gray-900 border-gray-700 focus:ring-blue-500/30" />
              <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors"><span className="font-semibold text-gray-300">Global</span> - Áp dụng cho tất cả Sản phẩm (v.d: Xuất xứ, Màu sắc, Bảo hành)</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Thứ tự xuất hiện (cao xếp trước):</label>
          <input type="number" value={form.ordering} onChange={(event) => patch({ ordering: Number(event.target.value) })} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
        </div>
      </div>

      <div>
        <h3 className="font-bold text-lg text-white mb-4 border-b border-gray-800 pb-2">Quản lý các giá trị</h3>
        <div className="space-y-3">
          {form.values.map((value, index) => (
            <div key={value.id || `new-${index}`} className="flex flex-col gap-3 bg-gray-900/50 p-3 rounded-lg border border-gray-800/80 hover:border-gray-700 transition-colors xl:flex-row xl:items-start">
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 xl:grid-cols-12">
                <div className="min-w-0 xl:col-span-3"><label className="block text-xs text-gray-500 mb-1">Giá trị: <span className="text-red-500">*</span></label><input id={`attribute-value-${index}`} value={value.value} onChange={(event) => updateValue(index, { value: event.target.value, ...(!value.id && !value.apiKey ? { apiKey: createAttributeValueApiKey(event.target.value) } : {}) })} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none" /></div>
                <div className="min-w-0 xl:col-span-3"><label className="block text-xs text-gray-500 mb-1">ApiKey: <span className="text-red-500">*</span></label><input value={value.apiKey} onChange={(event) => updateValue(index, { apiKey: event.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none" /></div>
                <div className="min-w-0 xl:col-span-3"><label className="block text-xs text-gray-500 mb-1">Ảnh icon:</label><input value={value.image} onChange={(event) => updateValue(index, { image: event.target.value })} placeholder="Nhập đường dẫn ảnh..." className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none" /></div>
                <div className="min-w-0 xl:col-span-1"><label className="block text-xs text-gray-500 mb-1">Trạng thái:</label><select disabled value="active" className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none"><option value="active">Hoạt động</option></select></div>
                <div className="min-w-0 xl:col-span-2"><label className="block text-xs text-gray-500 mb-1">Thứ tự:</label><input type="text" inputMode="numeric" value={value.ordering} onChange={(event) => updateValue(index, { ordering: Number(event.target.value) || 0 })} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white tabular-nums focus:border-blue-500 outline-none" /></div>
              </div>
              <div className="flex shrink-0 gap-2 xl:self-stretch xl:flex-col xl:border-l xl:border-gray-800 xl:pl-3">
                <button type="button" onClick={() => document.getElementById(`attribute-value-${index}`)?.focus()} className="flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded text-xs hover:bg-blue-500/20 transition-colors">Sửa</button>
                <button type="button" onClick={() => onRequestDeleteValue(value)} className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded text-xs hover:bg-red-500/20 transition-colors"><X className="w-3 h-3" /> Xóa</button>
              </div>
            </div>
          ))}
          <div className="flex justify-start border-t border-gray-800 pt-3">
            <button type="button" onClick={addValue} className="flex items-center gap-2 px-4 py-2 bg-teal-500/10 text-teal-400 border border-teal-500/50 rounded-lg hover:bg-teal-500/20 hover:shadow-[0_0_15px_rgba(20,184,166,0.2)] transition-all text-sm font-medium"><Plus className="w-4 h-4" /> Thêm giá trị</button>
          </div>
        </div>
      </div>
    </div>
  );
}
