'use client';

import { CheckSquare, Square, SlidersHorizontal } from 'lucide-react';
import { useState, useEffect } from 'react';

export function TabAttributes({ attributesData = [] }: { attributesData?: any[] }) {
  // Use local state so the user can toggle checkboxes before saving
  const [attributes, setAttributes] = useState<any[]>(attributesData);

  useEffect(() => {
    setAttributes(attributesData);
  }, [attributesData]);

  const toggleOption = (attrIndex: number, optionIndex: number) => {
    const newAttributes = [...attributes];
    const option = newAttributes[attrIndex].options[optionIndex];
    option.checked = !option.checked;
    setAttributes(newAttributes);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-end mb-4">
        <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-400 border border-blue-900 rounded-sm hover:bg-blue-900/30 transition-colors uppercase tracking-wider">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Sắp xếp theo STT của thuộc tính
        </button>
      </div>

      {attributes.length === 0 ? (
        <div className="p-10 text-center text-gray-500 font-mono italic border border-gray-800 rounded-sm glass-panel">
          Sản phẩm này chưa có thuộc tính nào được cấu hình cho danh mục của nó.
        </div>
      ) : (
        <div className="glass-panel border-gray-800 rounded-sm divide-y divide-gray-800/50 shadow-inner">
          {attributes.map((attr, idx) => (
            <div key={attr.id || idx} className="flex flex-col md:flex-row p-4 hover:bg-gray-900/30 transition-colors">
              <div className="w-full md:w-64 flex-shrink-0 mb-4 md:mb-0 pr-4 border-b md:border-b-0 md:border-r border-gray-800/50">
                <div className="font-bold text-gray-200">{attr.title}</div>
                <div className="text-xs text-gray-600 font-mono mt-1">{attr.code}</div>
                {attr.isSearch ? (
                  <div className="text-[10px] text-green-500 mt-2 uppercase tracking-wider">Có dùng làm bộ lọc</div>
                ) : (
                  <div className="text-[10px] text-gray-500 mt-2 uppercase tracking-wider cursor-pointer hover:text-red-400">Dùng là bộ lọc</div>
                )}
                {attr.inSummary ? (
                  <div className="text-[10px] text-green-500 mt-1 uppercase tracking-wider">Đang hiển thị ở tóm tắt</div>
                ) : (
                  <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider cursor-pointer hover:text-red-400">Hiển thị ở tóm tắt</div>
                )}
              </div>
              
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pl-0 md:pl-6">
                {attr.options.map((opt: any, optIdx: number) => (
                  <label key={opt.id || optIdx} className="flex items-center gap-2 cursor-pointer group" onClick={(e) => { e.preventDefault(); toggleOption(idx, optIdx); }}>
                    <div className="text-gray-500 group-hover:text-blue-400 transition-colors relative">
                      {opt.checked ? (
                        <CheckSquare className="w-4 h-4 text-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] relative z-10 bg-[#0a0a0f]" />
                      ) : (
                        <Square className="w-4 h-4 relative z-10 bg-[#0a0a0f]" />
                      )}
                    </div>
                    <span className={`text-sm ${opt.checked ? 'text-gray-200 font-medium' : 'text-gray-400 group-hover:text-gray-300'}`}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
