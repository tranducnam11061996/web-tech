export default function PcBuildPromotionBanner() {
  return (
    <div data-pc-build-promotion className="w-full aspect-[1/2] bg-gradient-to-b from-red-600 to-red-900 rounded-xl flex flex-col items-center justify-center text-center p-6 border border-red-500/30">
      <p className="text-yellow-300 font-bold text-lg mb-2">GIÁ TỐI THIỂU</p>
      <p className="text-white font-black text-2xl mb-4 leading-tight">HIỆU NĂNG TỐI ĐA</p>
      <div className="bg-yellow-500 text-black px-4 py-1.5 text-xs font-bold rounded-full mb-8">PC BUILD BỞI CHUYÊN GIA</div>

      <a href="/pc-van-phong.html" target="_blank" rel="noopener noreferrer" className="block w-full bg-white text-black p-4 rounded-lg mb-4 shadow-lg cursor-pointer hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-red-800">
        <p className="font-bold text-sm">PC VĂN PHÒNG</p>
        <p className="text-[10px] text-gray-500 font-bold mt-1">VOUCHER ĐẾN</p>
        <p className="text-red-600 font-black text-2xl mt-1">500K</p>
      </a>

      <a href="/pc-van-phong.html" target="_blank" rel="noopener noreferrer" className="block w-full bg-white text-black p-4 rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-red-800">
        <p className="font-bold text-sm">PC GAMING</p>
        <p className="text-[10px] text-gray-500 font-bold mt-1">VOUCHER ĐẾN</p>
        <p className="text-red-600 font-black text-2xl mt-1">2 TRIỆU</p>
      </a>
    </div>
  );
}
