"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ProductError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <><Header /><main className="flex min-h-[55vh] items-center justify-center bg-[#0a0a0c] px-4"><section className="max-w-lg rounded-2xl border border-red-500/30 bg-[#111115] p-8 text-center" role="alert"><h1 className="mb-3 text-2xl font-black text-white">Chưa thể tải nội dung</h1><p className="mb-6 text-sm text-zinc-400">Kết nối đang gặp sự cố tạm thời. Dữ liệu của bạn không bị thay đổi.</p><button type="button" onClick={reset} className="rounded-lg bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">Thử lại</button></section></main><Footer /></>;
}
