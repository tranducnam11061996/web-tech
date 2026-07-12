"use client";

import { useCustomerSession } from "@/lib/customer";
import { CreditCard, LogIn, LogOut, ShoppingCart, User, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function maskPhone(phone: string) {
  const value = phone.trim();
  if (!value) return "Tài khoản";
  if (value.length <= 4) return "****";
  return `${value.slice(0, -4)}****`;
}

export default function CustomerAccountMenu({ mobile = false }: { mobile?: boolean }) {
  const router = useRouter();
  const { user, loading, logout } = useCustomerSession();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const displayName = useMemo(() => user?.name?.trim() || maskPhone(user?.phone || ""), [user]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [open]);

  const signOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logout(); setOpen(false); router.replace("/"); router.refresh(); }
    finally { setLoggingOut(false); }
  };

  const guest = !loading && !user;
  return <div ref={rootRef} className={`customer-account-menu relative ${mobile ? "" : "shrink-0"}`} onMouseEnter={() => !mobile && setOpen(true)} onMouseLeave={() => !mobile && setOpen(false)}>
    <button type="button" onClick={() => setOpen((value) => !value)} onFocus={() => !mobile && setOpen(true)} aria-haspopup="menu" aria-expanded={open} aria-label={guest ? "Mở menu đăng nhập" : `Mở menu tài khoản ${displayName}`} className={`flex items-center text-gray-400 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 ${mobile ? "justify-center" : "max-w-[180px] gap-2"}`}>
      <User className={mobile ? "h-6 w-6" : "h-5 w-5 shrink-0"} aria-hidden="true" />
      {!mobile && !loading && user ? <span className="truncate text-xs font-bold text-slate-200">{displayName}</span> : null}
    </button>
    {open ? <div className={`absolute z-[90] w-64 ${mobile ? "bottom-full left-0 pb-3" : "right-0 top-full pt-3"}`}>
      <div role="menu" className="rounded-2xl border border-[#2c3a50] bg-[#0b0f17]/[.98] p-3 text-left shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl">
      {loading ? <p className="px-3 py-4 text-xs text-slate-500">Đang tải tài khoản...</p> : guest ? <>
        <p className="px-3 pb-3 pt-1 text-xs leading-5 text-slate-400">Đăng nhập để theo dõi đơn hàng và quản lý địa chỉ giao nhận.</p>
        <Link role="menuitem" href="/tai-khoan/dang-nhap" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#217af5] to-[#5d3ff0] px-4 py-3 text-sm font-black text-white"><LogIn className="h-4 w-4" />Đăng nhập</Link>
        <Link role="menuitem" href="/tai-khoan/dang-ky" onClick={() => setOpen(false)} className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-[#39516f] px-4 py-3 text-sm font-bold text-[#8bd4ff] hover:border-[#65c4ff] hover:text-white"><UserPlus className="h-4 w-4" />Đăng ký</Link>
      </> : <>
        <div className="mb-2 border-b border-white/10 px-3 pb-3 pt-1"><p className="truncate text-sm font-black text-white">{displayName}</p><p className="mt-1 truncate text-[11px] text-slate-500">{user?.email}</p></div>
        <Link role="menuitem" href="/tai-khoan" onClick={() => setOpen(false)} className="customer-account-menu-item"><User className="h-4 w-4" />Thông tin tài khoản</Link>
        <Link role="menuitem" href="/gio-hang" onClick={() => setOpen(false)} className="customer-account-menu-item"><ShoppingCart className="h-4 w-4" />Giỏ hàng</Link>
        <Link role="menuitem" href="/thanh-toan" onClick={() => setOpen(false)} className="customer-account-menu-item"><CreditCard className="h-4 w-4" />Thanh toán</Link>
        <button role="menuitem" type="button" disabled={loggingOut} onClick={() => void signOut()} className="customer-account-menu-item mt-1 w-full text-red-300 hover:bg-red-500/10 hover:text-red-200"><LogOut className="h-4 w-4" />{loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</button>
      </>}
      </div>
    </div> : null}
  </div>;
}
