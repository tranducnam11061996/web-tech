'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import clsx from 'clsx';

export function TabBasic() {
  const [values, setValues] = useState([
    { id: 7263, value: 'FAN Xuôi', apiKey: 'fan-xuoi', icon: '', status: 'Hoạt động', desc: '', seq: 0 },
    { id: 7264, value: 'Fan Ngược', apiKey: 'fan-nguoc', icon: '', status: 'Hoạt động', desc: '', seq: 0 },
  ]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Tên thuộc tính: <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            defaultValue="Kiểu quạt"
            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Mã thuộc tính: <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            defaultValue="kieu_fan_lam_mat"
            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Mô tả tóm tắt (nếu muốn hiển thị và giải thích ý nghĩa cho khách hàng)
          </label>
          <textarea 
            rows={3}
            defaultValue="kieu_fan_lam_mat"
            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-y"
          />
        </div>
      </div>

      {/* Applied Options */}
      <div className="space-y-3 p-4 border border-gray-800 rounded bg-gray-900/30">
        <h3 className="font-semibold text-gray-200 border-b border-gray-800 pb-2 mb-3">Lựa chọn áp dụng</h3>
        
        <label className="flex items-center gap-3 cursor-pointer group">
          <input type="checkbox" className="w-4 h-4 rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 focus:ring-blue-500/30" />
          <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">Dùng là tiêu đề nhóm cho các thuộc tính đứng sau</span>
        </label>
        
        <label className="flex items-center gap-3 cursor-pointer group">
          <input type="checkbox" defaultChecked className="w-4 h-4 rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 focus:ring-blue-500/30" />
          <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">Dùng lọc Sản phẩm ở danh mục</span>
        </label>
        
        <label className="flex items-center gap-3 cursor-pointer group">
          <input type="checkbox" className="w-4 h-4 rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 focus:ring-blue-500/30" />
          <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">Hiển thị ở thông tin tóm tắt Sản phẩm</span>
        </label>
        
        <label className="flex items-center gap-3 cursor-pointer group">
          <input type="checkbox" className="w-4 h-4 rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 focus:ring-blue-500/30" />
          <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">Hiển thị ở bảng thông số kỹ thuật</span>
        </label>
        
        <label className="flex items-center gap-3 cursor-pointer group">
          <input type="checkbox" className="w-4 h-4 rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 focus:ring-blue-500/30" />
          <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">Dùng để tạo các cấu hình của Sản phẩm</span>
        </label>
      </div>

      {/* Filter code and Classification */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Mã bộ lọc trên Url (v.d. cpu (trên link lọc ?cpu=32Ghz&ram=32GB)):
          </label>
          <input 
            type="text" 
            placeholder="Nhập mã bộ lọc..."
            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Phân loại <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="radio" name="classification" defaultChecked className="w-4 h-4 text-blue-500 bg-gray-900 border-gray-700 focus:ring-blue-500/30" />
              <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
                <span className="font-semibold text-gray-300">Local</span> - Chỉ áp dụng cho một số loại Sản phẩm
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="radio" name="classification" className="w-4 h-4 text-blue-500 bg-gray-900 border-gray-700 focus:ring-blue-500/30" />
              <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
                <span className="font-semibold text-gray-300">Global</span> - Áp dụng cho tất cả Sản phẩm (v.d: Xuất xứ, Màu sắc, Bảo hành)
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Thứ tự xuất hiện (cao xếp trước):
          </label>
          <input 
            type="number" 
            defaultValue={0}
            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Values Management */}
      <div>
        <h3 className="font-bold text-lg text-white mb-4 border-b border-gray-800 pb-2">Quản lý các giá trị</h3>
        
        <div className="space-y-3">
          {values.map((v, idx) => (
            <div key={idx} className="flex items-start gap-2 bg-gray-900/50 p-3 rounded-lg border border-gray-800/80 hover:border-gray-700 transition-colors">
              <div className="flex-1 grid grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ID: <span className="text-red-500">*</span></label>
                  <input readOnly value={v.id} className="w-full bg-gray-800/50 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Giá trị: <span className="text-red-500">*</span></label>
                  <input defaultValue={v.value} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ApiKey: <span className="text-red-500">*</span></label>
                  <input defaultValue={v.apiKey} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ảnh icon:</label>
                  <input placeholder="Nhập đường dẫn ảnh..." className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Trạng thái:</label>
                  <select className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none">
                    <option>Hoạt động</option>
                    <option>Tạm ẩn</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Mô tả:</label>
                  <input placeholder="Nhập mô tả..." className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Thứ tự xuất hiện:</label>
                  <input type="number" defaultValue={0} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none" />
                </div>
              </div>
              <div className="flex flex-col gap-2 ml-2 mt-5">
                <button className="flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded text-xs hover:bg-blue-500/20 transition-colors">
                  Sửa
                </button>
                <button className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded text-xs hover:bg-red-500/20 transition-colors">
                  <X className="w-3 h-3" />
                  Xóa
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-center pt-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-teal-500/10 text-teal-400 border border-teal-500/50 rounded-lg hover:bg-teal-500/20 hover:shadow-[0_0_15px_rgba(20,184,166,0.2)] transition-all text-sm font-medium">
              <Plus className="w-4 h-4" />
              Thêm giá trị
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
