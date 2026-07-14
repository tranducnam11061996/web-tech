"use client";

import { Heart, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProductGridCard, { type ProductGridCardData } from "@/components/ProductGridCard";
import { customerFetch, useCustomerSession } from "@/lib/customer";
import { usePrimeCustomerFavorites } from "@/lib/customerFavorites";

type FavoriteListResponse = {
  items: ProductGridCardData[];
  nextCursor: number | null;
};

function FavoriteGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-[#27272a] bg-[#111113]">
          <div className="aspect-square animate-pulse bg-[#1a1a1d]" />
          <div className="space-y-3 p-4">
            <div className="h-4 animate-pulse rounded bg-white/5" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-white/5" />
            <div className="mt-6 h-6 w-1/2 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FavoritesPageClient() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useCustomerSession();
  const primeFavoriteIds = usePrimeCustomerFavorites();
  const [items, setItems] = useState<ProductGridCardData[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.replace("/tai-khoan/dang-nhap?returnTo=%2Fyeu-thich");
    }
  }, [router, sessionLoading, user]);

  const loadFavorites = useCallback(async (cursor: number | null, append: boolean) => {
    if (!user) return;
    append ? setLoadingMore(true) : setLoadingInitial(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "24" });
      if (cursor) params.set("cursor", String(cursor));
      const data = await customerFetch(`/api/customer/favorites?${params.toString()}`) as FavoriteListResponse;
      const nextItems = Array.isArray(data?.items) ? data.items : [];
      primeFavoriteIds(nextItems.map((product) => Number(product.id)));
      setItems((current) => {
        if (!append) return nextItems;
        const merged = new Map(current.map((product) => [Number(product.id), product]));
        for (const product of nextItems) merged.set(Number(product.id), product);
        return Array.from(merged.values());
      });
      setNextCursor(Number(data?.nextCursor || 0) || null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải danh sách yêu thích.");
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, [primeFavoriteIds, user]);

  useEffect(() => {
    if (!user) return;
    setItems([]);
    setNextCursor(null);
    void loadFavorites(null, false);
  }, [loadFavorites, user]);

  const waitingForAccount = sessionLoading || (!user && loadingInitial);

  return (
    <div className="min-h-screen bg-[#09090c] text-white">
      <Header />
      <main id="main-content" className="mx-auto min-h-[70vh] max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="mb-8 border-b border-[#27272a] pb-6">
          <div className="flex items-center gap-3 text-pink-300">
            <span className="grid h-11 w-11 place-items-center rounded-full border border-pink-400/30 bg-pink-500/10">
              <Heart className="h-5 w-5" fill="currentColor" aria-hidden="true" />
            </span>
            <p className="font-mono text-xs font-black uppercase tracking-[.18em]">Saved hardware</p>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-[-.035em] sm:text-4xl">Sản phẩm đã lưu</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Những sản phẩm bạn đã đánh dấu Yêu thích !
          </p>
        </header>

        {waitingForAccount || (user && loadingInitial && items.length === 0) ? (
          <section aria-busy="true" aria-label="Đang tải danh sách yêu thích">
            <FavoriteGridSkeleton />
          </section>
        ) : error && items.length === 0 ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 px-6 py-16 text-center" role="alert">
            <h2 className="text-xl font-black">Chưa thể tải danh sách yêu thích</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">{error}</p>
            <button
              type="button"
              onClick={() => void loadFavorites(null, false)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-red-300/40 px-5 py-3 text-sm font-black text-red-100 outline-none transition hover:border-red-200 focus-visible:ring-2 focus-visible:ring-red-300"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Thử tải lại
            </button>
          </section>
        ) : items.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-[#3f3f46] bg-[#111116] px-6 py-20 text-center">
            <Heart className="mx-auto h-10 w-10 text-zinc-600" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-black">Bạn chưa lưu sản phẩm nào</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
              Chọn biểu tượng trái tim trên sản phẩm để giữ lại những lựa chọn bạn muốn xem sau.
            </p>
            <Link href="/" className="mt-6 inline-flex rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 outline-none transition hover:bg-cyan-300 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-4 focus-visible:ring-offset-[#111116]">
              Khám phá sản phẩm
            </Link>
          </section>
        ) : (
          <section aria-label="Danh sách sản phẩm yêu thích">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {items.map((product) => (
                <ProductGridCard
                  key={product.id}
                  product={product}
                  onFavoriteChange={(favorited) => {
                    if (!favorited) setItems((current) => current.filter((item) => Number(item.id) !== Number(product.id)));
                  }}
                />
              ))}
            </div>
            {error ? <p className="mt-5 rounded-xl border border-red-400/25 bg-red-500/5 px-4 py-3 text-sm text-red-100" role="alert">{error}</p> : null}
            {nextCursor ? (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  aria-busy={loadingMore || undefined}
                  onClick={() => void loadFavorites(nextCursor, true)}
                  className="rounded-xl border border-cyan-300/40 bg-cyan-400/5 px-6 py-3 text-sm font-black text-cyan-100 outline-none transition hover:border-cyan-200 hover:bg-cyan-400/10 focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-wait disabled:opacity-60"
                >
                  {loadingMore ? "Đang tải..." : "Xem thêm"}
                </button>
              </div>
            ) : null}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
