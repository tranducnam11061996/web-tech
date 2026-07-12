'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import clsx from 'clsx';

type CatNode = {
  id: number;
  name: string;
  hasChildren: boolean;
  selected?: boolean;
};

export function TabCategories() {
  const [categories, setCategories] = useState<CatNode[]>([
    { id: 1, name: 'PC - Văn Phòng, Đồ Họa', hasChildren: true },
    { id: 2, name: 'Sản phẩm Apple', hasChildren: true },
    { id: 3, name: 'Đồ Chơi Mô Hình Chính Hãng', hasChildren: true },
    { id: 4, name: 'Sét Quà Yêu Thương', hasChildren: true },
    { id: 5, name: 'Quà Tặng Khuyến Mãi', hasChildren: true },
    { id: 6, name: 'Sản phẩm AI', hasChildren: true },
    { id: 7, name: 'Giảm giá trực tiếp', hasChildren: true },
    { id: 8, name: 'Thu Cũ Đổi Mới, Lên Đời', hasChildren: true },
    { id: 9, name: 'Dịch Vụ Sửa Chữa, Lắp Đặt', hasChildren: true },
    { id: 10, name: 'Thiết Bị Mô Phỏng, Mô Hình', hasChildren: true },
    { id: 11, name: 'Linh Kiện Tản Nước Thanh Lý', hasChildren: true },
  { id: 12, name: 'Gợi ý của TrucTiepGAME', hasChildren: true },
    { id: 13, name: 'Gia Dụng, Điện Máy, Sức Khỏe', hasChildren: true },
    { id: 14, name: 'Laptop, Tablet, Surface', hasChildren: true },
    { id: 15, name: 'Test', hasChildren: true },
    { id: 16, name: 'PS5, Xbox, Nintendo, Game Pad', hasChildren: true },
    { id: 17, name: 'ConceptD Chuyên Đồ Họa', hasChildren: true },
    { id: 18, name: 'Hàng Hiệu Cũ, Siêu Tiết Kiệm', hasChildren: true },
    { id: 19, name: 'Tivi, Máy Lọc Không Khí', hasChildren: true },
    { id: 20, name: 'Thiết Bị Nhà Thông Minh', hasChildren: true },
    { id: 21, name: 'Phụ Kiện Laptop, PC, Điện Thoại', hasChildren: true },
    { id: 22, name: 'TB Siêu Thị, Máy Bán Hàng', hasChildren: true },
    { id: 23, name: 'Tản Nhiệt, Fan, Đèn Led', hasChildren: true, selected: true }, // Highlighted in the design
    { id: 24, name: 'GameNet - Phòng Game', hasChildren: true },
  ]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h3 className="font-bold text-gray-200 mb-2">Danh mục được chọn cho thuộc tính:</h3>
        <div className="text-blue-400 font-medium bg-blue-950/20 p-3 rounded-lg border border-blue-900/30">
          - Quạt Tản nhiệt
        </div>
      </div>

      <div>
        <h3 className="font-bold text-gray-200 mb-3">Hãy chọn danh mục cho thuộc tính</h3>
        <button className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-md text-sm hover:bg-blue-500/20 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all mb-4">
          Hiển thị tất cả danh mục con
        </button>

        <div className="space-y-1 mt-4 p-4 border border-gray-800/80 rounded-lg bg-gray-900/30">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 py-1 hover:bg-gray-800/40 rounded px-2 transition-colors">
              <button className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                <Plus className="w-3 h-3" />
              </button>
              <input 
                type="checkbox" 
                defaultChecked={cat.selected}
                className="w-4 h-4 rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 focus:ring-blue-500/30 cursor-pointer" 
              />
              <span className={clsx(
                "text-sm cursor-pointer hover:underline",
                cat.selected ? "text-blue-400" : "text-gray-300 hover:text-blue-400"
              )}>
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
