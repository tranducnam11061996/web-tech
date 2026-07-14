"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Heart, KeyRound, LayoutList, LogOut, MapPin, UserRound } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCustomerSession } from "@/lib/customer";

const items = [
  { href: "/tai-khoan", label: "Thông tin tài khoản", icon: UserRound },
  { href: "/tai-khoan/don-hang", label: "Đơn hàng của tôi", icon: LayoutList },
  { href: "/yeu-thich", label: "Sản phẩm đã lưu", icon: Heart, newTab: true },
  { href: "/tai-khoan/so-dia-chi", label: "Sổ địa chỉ", icon: MapPin },
  { href: "/tai-khoan/doi-mat-khau", label: "Đổi mật khẩu", icon: KeyRound },
];

export default function CustomerAccountShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useCustomerSession();
  useEffect(() => {
    if (!loading && !user) router.replace("/tai-khoan/dang-nhap");
  }, [loading, user, router]);
  if (loading || !user)
    return (
      <div className="min-h-screen bg-[#09090c] text-slate-400">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-20">
          Đang tải tài khoản...
        </main>
      </div>
    );
  const current = pathname.startsWith("/tai-khoan/don-hang/")
    ? "/tai-khoan/don-hang"
    : pathname;
  return (
    <div className="min-h-screen bg-[#09090c] text-white">
      <Header />
      <main className="mx-auto grid max-w-[1400px] gap-6 px-4 py-7 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[#252532] bg-[#111116] p-3 lg:sticky lg:top-5 lg:h-fit">
          <div className="border-b border-[#252532] px-3 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-cyan-300">
              Tài khoản TrucTiepGAME
            </p>
            <p className="mt-2 truncate font-bold">{user.name}</p>
            <p className="truncate text-sm text-slate-400">{user.email}</p>
          </div>
          <nav
            className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-1"
            aria-label="Tài khoản"
          >
            {items.map((item) => {
              const Icon = item.icon;
              const active = current === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.newTab ? "_blank" : undefined}
                  rel={item.newTab ? "noopener noreferrer" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium outline-none transition focus:ring-2 focus:ring-cyan-400 ${active ? "bg-cyan-400/10 text-cyan-200" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={async () => {
              await logout();
              router.replace("/");
            }}
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-300 outline-none transition hover:bg-red-500/10 focus:ring-2 focus:ring-red-400"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Đăng xuất
          </button>
        </aside>
        <section className="min-w-0">{children}</section>
      </main>
      <Footer />
    </div>
  );
}
