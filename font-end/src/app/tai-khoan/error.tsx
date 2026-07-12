"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useEffect } from "react";

export default function CustomerAccountError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Customer account route error", error); }, [error]);

  return <div className="min-h-screen bg-[#09090c] text-white">
    <Header />
    <main id="main-content" className="mx-auto grid min-h-[62vh] max-w-xl place-items-center px-4 py-16 text-center">
      <section className="w-full rounded-2xl border border-red-400/25 bg-[#111116] p-7 shadow-[0_24px_80px_rgba(0,0,0,.35)]" aria-labelledby="customer-account-error-title">
        <p className="text-xs font-black uppercase tracking-[.18em] text-red-300">Tài khoản tạm thời gián đoạn</p>
        <h1 id="customer-account-error-title" className="mt-3 text-2xl font-black">Không thể mở thông tin tài khoản</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Phiên đăng nhập hoặc kết nối vừa gặp sự cố. Bạn có thể thử lại mà không mất dữ liệu.</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={reset} className="rounded-xl bg-gradient-to-r from-[#217af5] to-[#5d3ff0] px-4 py-3 text-sm font-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">Thử lại</button>
          <Link href="/tai-khoan/dang-nhap" className="rounded-xl border border-[#40516c] px-4 py-3 text-sm font-bold text-[#9bd9ff] hover:border-[#69c9ff] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">Đăng nhập lại</Link>
        </div>
      </section>
    </main>
  </div>;
}
