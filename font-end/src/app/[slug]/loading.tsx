import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ProductLoading() {
  return <><Header /><main className="mx-auto min-h-[60vh] max-w-[1800px] px-4 py-6 md:px-6" aria-busy="true" aria-label="Đang tải nội dung"><div className="mb-6 h-5 w-64 animate-pulse rounded bg-zinc-800" /><div className="grid gap-6 lg:grid-cols-[40fr_60fr]"><div className="aspect-square animate-pulse rounded-2xl bg-[#111115]" /><div className="space-y-4"><div className="h-8 w-4/5 animate-pulse rounded bg-zinc-800" /><div className="h-24 animate-pulse rounded-xl bg-[#111115]" /><div className="h-64 animate-pulse rounded-xl bg-[#111115]" /></div></div><p className="sr-only" role="status">Đang tải sản phẩm</p></main><Footer /></>;
}
