import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return <><Header /><main className="flex min-h-[55vh] items-center justify-center bg-[#0a0a0c] px-4"><section className="max-w-lg rounded-2xl border border-[#27272a] bg-[#111115] p-8 text-center"><p className="mb-2 text-sm font-bold uppercase tracking-widest text-cyan-400">404</p><h1 className="mb-3 text-2xl font-black text-white">Không tìm thấy nội dung</h1><p className="mb-6 text-sm text-zinc-400">Sản phẩm hoặc danh mục có thể đã được đổi địa chỉ hoặc ngừng hiển thị.</p><Link href="/" className="inline-flex rounded-lg bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">Về trang chủ</Link></section></main><Footer /></>;
}
