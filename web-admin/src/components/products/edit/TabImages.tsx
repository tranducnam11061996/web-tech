'use client';

import { useState } from 'react';
import { Star, Trash2, Upload, FileImage, ImageOff } from 'lucide-react';

type ImageNode = {
  id: number;
  stt: number;
  url: string;
  alt: string;
  isMain: boolean;
};

// Simple SVG data URI for fallback - a camera icon on dark background
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23111827'/%3E%3Cpath d='M55 55h40v35H55z' fill='none' stroke='%234B5563' stroke-width='2'/%3E%3Ccircle cx='75' cy='72' r='10' fill='none' stroke='%234B5563' stroke-width='2'/%3E%3Cpath d='M62 55l5-8h16l5 8' fill='none' stroke='%234B5563' stroke-width='2'/%3E%3Ctext x='75' y='105' text-anchor='middle' fill='%236B7280' font-size='10' font-family='monospace'%3ENo Image%3C/text%3E%3C/svg%3E";

function ImageCard({ img }: { img: ImageNode }) {
  const [imgSrc, setImgSrc] = useState(img.url);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="glass-panel border-gray-800 rounded-md overflow-hidden flex flex-col group shadow-md hover:border-red-500/50 transition-colors">
      <div className="relative h-32 w-full bg-gray-950 p-2 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={img.alt}
          className="w-full h-full object-contain"
          onError={() => {
            if (!hasError) {
              setHasError(true);
              setImgSrc(FALLBACK_IMAGE);
            }
          }}
          loading="lazy"
        />
        <button className="absolute top-2 right-2 p-1.5 bg-red-950/80 text-red-500 rounded hover:bg-red-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 backdrop-blur-sm">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        {hasError && (
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-yellow-900/80 text-yellow-400 text-[8px] font-mono rounded backdrop-blur-sm">
            Ảnh gốc lỗi
          </div>
        )}
      </div>
      
      <div className="p-2 space-y-2 bg-gray-900/50 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-gray-500 uppercase">STT</div>
          <input type="number" defaultValue={img.stt} className="w-full bg-gray-950 border border-gray-700 rounded-sm px-1.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-red-500/50" />
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-gray-500 uppercase">Alt</div>
          <input type="text" defaultValue={img.alt} className="w-full bg-gray-950 border border-gray-700 rounded-sm px-1.5 py-1 text-[10px] font-mono text-gray-400 focus:outline-none focus:border-red-500/50 truncate" />
        </div>
        <button className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold uppercase rounded-sm transition-colors border ${
          img.isMain 
            ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10 shadow-[0_0_10px_rgba(234,179,8,0.2)]' 
            : 'border-gray-700 text-gray-400 hover:border-blue-500/50 hover:text-blue-400'
        }`}>
          <Star className={`w-3.5 h-3.5 ${img.isMain ? 'fill-yellow-500' : ''}`} /> Ảnh chính
        </button>
      </div>
    </div>
  );
}

export function TabImages({ images = [] }: { images?: ImageNode[] }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2 mb-4">
        <span className="w-1 h-4 bg-red-500 rounded-full inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
        Ảnh sản phẩm ({images.length})
      </h3>

      {images.length === 0 && (
        <div className="p-8 text-center text-gray-500 border border-dashed border-gray-800 rounded-lg bg-gray-950/30">
          <ImageOff className="w-10 h-10 mx-auto mb-2 text-gray-600" />
          <p className="font-mono text-sm">Chưa có ảnh nào cho sản phẩm này.</p>
        </div>
      )}

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {images.map((img) => (
          <ImageCard key={img.id} img={img} />
        ))}
      </div>

      {/* Upload Area */}
      <div className="mt-8 border border-gray-800 border-dashed rounded-lg p-6 bg-gray-950/30">
        <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest mb-4">Thêm ảnh cho sản phẩm</h3>
        
        <div className="flex items-center gap-2 mb-4">
          <button className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-sm shadow-[0_0_10px_rgba(37,99,235,0.4)] uppercase tracking-wider">Hình sản phẩm</button>
          <button className="px-4 py-2 text-xs font-bold text-gray-400 bg-gray-900 border border-gray-800 rounded-sm hover:text-gray-200 transition-colors uppercase tracking-wider">Khách hàng chụp</button>
          <button className="px-4 py-2 text-xs font-bold text-gray-400 bg-gray-900 border border-gray-800 rounded-sm hover:text-gray-200 transition-colors uppercase tracking-wider">Hacom tự chụp</button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <button className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-gray-300 bg-gray-900 border border-gray-700 rounded-sm hover:border-red-500/50 hover:text-red-400 transition-colors uppercase tracking-wider group">
            <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" /> Chọn tệp...
          </button>
          <span className="text-gray-500 italic text-sm">hoặc</span>
          <button className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-blue-400 bg-blue-950/20 border border-blue-900 rounded-sm hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-colors uppercase tracking-wider">
            <FileImage className="w-4 h-4" /> Kho ảnh có sẵn
          </button>
        </div>

        <div className="text-xs text-gray-500 space-y-1 font-mono">
          <div>Bạn đã chọn <strong className="text-blue-400">0.00MB / 50MB</strong>. Dung lượng còn lại <strong className="text-green-400">50.00MB</strong>.</div>
          <div className="text-yellow-500/80">Lưu ý: Tổng dung lượng ảnh tải lên tối đa là 50MB.</div>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Ảnh Sản phẩm kích thước lớn sẽ được tự động co lại thành các ảnh nhỏ hơn cho những vị trí liên quan.</li>
            <li>Tùy giao diện website của bạn mà kích thước ảnh Sản phẩm khác nhau.</li>
            <li>Chỉ dùng file ảnh đuôi .jpg và .gif.</li>
            <li>Cập nhật hình ảnh cho Sản phẩm ở nhiều góc cạnh, màu sắc để người dùng xem rõ nhất. Nên cập nhật ảnh có kích thước lớn và độ phân giải cao.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
