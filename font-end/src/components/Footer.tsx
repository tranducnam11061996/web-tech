'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Clock3, Facebook, Instagram, Mail, MapPin, Music2, Phone, ShieldCheck, Youtube, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fallbackBottomFooterMenu, loadBottomFooterMenu } from '@/lib/bottomFooterMenu';
import { fallbackFooterMenu, loadFooterMenu } from '@/lib/footerMenu';

type ContactItem = {
  label: string;
  lines: string[];
  icon: LucideIcon;
  desktopWidth: string;
};

const CONTACT_ITEMS: ContactItem[] = [
  {
    label: 'HOTLINE',
    lines: ['098.655.2233', '087.997.9997'],
    icon: Phone,
    desktopWidth: '2xl:w-[150px] min-[1800px]:w-[160px]',
  },
  {
    label: 'EMAIL',
    lines: ['pcm.qlkt@gmail.com', 'ttgshoponline@gmail.com'],
    icon: Mail,
    desktopWidth: '2xl:w-[210px] min-[1800px]:w-[230px]',
  },
  {
    label: 'SHOWROOM',
    lines: ['83 - 85 Thái Hà - Đống Đa - HN', '83A Cửu Long - Phường 15 - Q10 - TP.HCM'],
    icon: MapPin,
    desktopWidth: '2xl:w-[360px] min-[1800px]:w-[400px]',
  },
  {
    label: 'GIỜ MỞ CỬA',
    lines: ['Sáng: 9h - 12h', 'Chiều: 13h30 - 19h30'],
    icon: Clock3,
    desktopWidth: '2xl:w-[190px] min-[1800px]:w-[210px]',
  },
];

function XSocialIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M4.5 4.5 19.5 19.5M19.5 4.5 4.5 19.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { label: 'Instagram', href: '#', icon: Instagram, className: 'from-fuchsia-700/90 to-purple-950' },
  { label: 'Facebook', href: 'https://www.facebook.com/pcmarket.vn', icon: Facebook, className: 'from-cyan-600/80 to-cyan-950' },
  { label: 'YouTube', href: 'https://www.youtube.com/@PCM.channel', icon: Youtube, className: 'from-red-600/80 to-red-950' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@pcm.studio', icon: Music2, className: 'from-indigo-500/80 to-slate-950' },
];

const GROUP_HEADING_COLORS = ['text-emerald-400', 'text-cyan-400', 'text-sky-400', 'text-blue-400'];

function BrandMark() {
  return (
    <Link href="/" aria-label="Trang chủ TrucTiepGAME" className="inline-flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-400 via-purple-500 to-blue-500 p-[2px]">
        <span className="flex h-full w-full items-center justify-center rounded-full bg-[#111214] text-white">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
          </svg>
        </span>
      </span>
      <span className="text-xl font-semibold tracking-tight text-white sm:inline xl:text-[22px]">TrucTiepGAME</span>
    </Link>
  );
}

function ContactCard({ item }: { item: ContactItem }) {
  const Icon = item.icon;

  return (
    <div
      data-footer-contact-card
      className={`w-full rounded-xl border border-purple-400/15 bg-gradient-to-br from-[#17171f] to-[#111217] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] ${item.desktopWidth}`}
    >
      <h5 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 xl:text-xs">
        <Icon className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.7} aria-hidden="true" />
        {item.label}
      </h5>
      <p className="text-[13px] font-medium leading-[1.7] text-zinc-200 xl:text-sm">
        {item.lines.map((line) => <span key={line} className="block">{line}</span>)}
      </p>
    </div>
  );
}

function PaymentMarks() {
  return (
    <div data-footer-payments className="flex flex-nowrap items-center justify-center gap-x-3 lg:justify-end">
      <div className="flex items-center gap-1.5 text-sm font-bold italic text-white xl:text-[15px]">
        <ShieldCheck className="h-5 w-5" fill="currentColor" strokeWidth={1.6} aria-hidden="true" />
        <span>SSL<br />Secure</span>
      </div>
      <div className="text-center text-[11px] font-semibold italic leading-[1.05] text-zinc-200 xl:text-xs">
        Verified by<br /><span className="text-lg font-black text-white">VISA</span>
      </div>
      <div className="text-center text-[10px] font-semibold italic leading-[1.05] text-zinc-200 xl:text-[11px]">
        <span className="block text-[14px] font-black text-white xl:text-[15px]">MasterCard.</span>SecureCode
      </div>
      <div role="img" className="flex h-7 w-10 items-center justify-center rounded bg-white" aria-label="Mastercard">
        <span className="h-4 w-4 rounded-full bg-red-500" />
        <span className="-ml-1.5 h-4 w-4 rounded-full bg-amber-400/90" />
      </div>
      <div role="img" className="flex h-7 w-10 items-center justify-center rounded bg-white text-[10px] font-black italic text-[#1a1f71]" aria-label="Visa">VISA</div>
    </div>
  );
}

export default function Footer() {
  const [footerMenu, setFooterMenu] = useState(fallbackFooterMenu);
  const [bottomFooterMenu, setBottomFooterMenu] = useState(fallbackBottomFooterMenu);

  useEffect(() => {
    let cancelled = false;

    Promise.all([loadFooterMenu(), loadBottomFooterMenu()]).then(([menu, bottomMenu]) => {
      if (!cancelled) {
        setFooterMenu(menu);
        setBottomFooterMenu(bottomMenu);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleFooterGroups = footerMenu.groups.filter((group) => group.links.length > 0);
  const hasBottomFooterLinks = bottomFooterMenu.links.length > 0;

  return (
    <footer
      data-footer-root
      className="relative z-10 mt-10 overflow-hidden border-t border-white/[0.04] bg-[linear-gradient(to_bottom,#151515_0%,#121212_45%,#0a0a0a_100%)] text-zinc-300"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/45 to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-44 top-0 h-[420px] w-[420px] rounded-full bg-cyan-500/[0.035] blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-40 top-20 h-[380px] w-[380px] rounded-full bg-purple-500/[0.035] blur-3xl" aria-hidden="true" />

      <div data-footer-container className="relative z-10 mx-auto w-full max-w-[1700px] px-6 py-16 lg:px-8 xl:max-w-[1800px]">
        <div data-footer-top className="xl:grid xl:grid-cols-3 xl:gap-16">
          <div data-footer-intro className="space-y-8 md:grid md:grid-cols-2 md:items-start md:gap-8 md:space-y-0 xl:block xl:space-y-8">
            <div>
              <div className="mb-7">
                <BrandMark />
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 xl:text-[11px]">Cùng bạn setup góc gaming mơ ước</p>
              </div>
              <p className="max-w-sm text-sm leading-[1.65] text-zinc-400 xl:max-w-[460px] xl:text-[15px]">
                Nâng tầm trải nghiệm chơi game và học tập của bạn với cấu hình tối ưu, linh kiện cao cấp, phù hợp với ngân sách của bạn
              </p>
            </div>

            <div data-footer-newsletter className="max-w-sm rounded-2xl border border-purple-400/15 bg-gradient-to-br from-[#191920] to-[#131318] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] xl:max-w-[430px]">
              <h4 className="text-sm font-bold text-white xl:text-base">Đăng ký</h4>
              <p className="mt-2 text-xs text-zinc-500 xl:text-[13px]">Nhận email thông báo các ưu đãi mới nhất</p>
              <p id="newsletter-unavailable" className="sr-only">Bạn có thể nhập email; tính năng gửi đăng ký nhận bản tin hiện chưa khả dụng.</p>
              <div className="mt-4 flex">
                <input
                  type="email"
                  name="newsletterEmail"
                  autoComplete="email"
                  spellCheck="false"
                  aria-label="Email nhận bản tin"
                  aria-describedby="newsletter-unavailable"
                  placeholder="Email Của Bạn"
                  className="min-w-0 flex-1 rounded-l-lg border border-r-0 border-purple-400/20 bg-transparent px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-400 focus:ring-2 focus:ring-purple-500/60 xl:text-[15px]"
                />
                <button
                  type="button"
                  disabled
                  aria-describedby="newsletter-unavailable"
                  className="shrink-0 cursor-not-allowed rounded-r-lg border border-purple-400/20 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70 xl:text-[15px]"
                >
                  Đăng ký
                </button>
              </div>
            </div>
          </div>

          {visibleFooterGroups.length > 0 ? (
            <nav data-footer-groups aria-label="Liên kết chân trang" className="mt-16 grid grid-cols-2 gap-x-6 gap-y-16 md:grid-cols-4 md:gap-8 xl:col-span-2 xl:mt-0">
              {visibleFooterGroups.map((group, groupIndex) => (
                <section data-footer-group key={group.id} aria-labelledby={`footer-group-${group.id}`}>
                  <h4 id={`footer-group-${group.id}`} className={`mb-6 text-xs font-bold uppercase tracking-[0.22em] xl:text-[13px] ${GROUP_HEADING_COLORS[groupIndex % GROUP_HEADING_COLORS.length]}`}>
                    {group.label}
                  </h4>
                  <ul className="space-y-4 text-[13px] font-medium xl:text-sm">
                    {group.links.map((link) => (
                      <li key={link.id}>
                        <a href={link.url || '#'} className="group inline-flex items-center gap-2 rounded-sm text-zinc-400 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 motion-reduce:transition-none">
                          {link.suffixText ? <span className="text-orange-500" aria-hidden="true">{link.suffixText}</span> : null}
                          <span>{link.label}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </nav>
          ) : null}
        </div>

        <section data-footer-contact-section aria-label="Thông tin liên hệ" className="mt-16 border-t border-white/[0.06] pt-8">
          <div className="flex flex-col gap-8 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:flex 2xl:w-auto 2xl:shrink-0">
              {CONTACT_ITEMS.map((item) => <ContactCard key={item.label} item={item} />)}
            </div>

            <div className="flex w-full flex-col items-center gap-8 sm:flex-row sm:flex-wrap sm:items-start sm:justify-center 2xl:w-auto 2xl:flex-nowrap 2xl:justify-end">
              <div data-footer-socials className="text-center 2xl:text-left">
                <h5 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 xl:text-xs">THEO DÕI CHÚNG TÔI</h5>
                <div className="flex items-center justify-center gap-3 2xl:justify-start">
                  {SOCIAL_LINKS.map((social, index) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={social.label}
                        href={social.href}
                        aria-label={social.label}
                        className={`flex h-12 w-12 items-center justify-center bg-gradient-to-br text-zinc-300 transition-transform duration-200 hover:-translate-y-1 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 motion-reduce:transform-none motion-reduce:transition-none ${social.className}`}
                        style={{ borderRadius: index % 2 === 0 ? '42% 58% 50% 50% / 48% 45% 55% 52%' : '55% 45% 48% 52% / 42% 52% 48% 58%' }}
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
              </div>

              <div data-footer-certifications className="w-full max-w-[350px] text-center 2xl:text-left min-[1800px]:max-w-[380px]">
                <h5 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 xl:text-xs">CHỨNG NHẬN</h5>
                <div className="grid grid-cols-[minmax(0,4fr)_minmax(0,3fr)] items-center gap-3">
                  <a href="#" aria-label="Chứng nhận Bộ Công Thương" className="flex h-[58px] items-center justify-center rounded-xl border border-purple-400/15 bg-[#111117] px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80">
                    <Image src="/images/BoCongThuong.png" alt="Đã thông báo Bộ Công Thương" width={200} height={76} className="h-auto max-h-[44px] w-auto max-w-full object-contain" />
                  </a>
                  <a href="#" aria-label="Chứng nhận DMCA" className="flex h-[58px] items-center justify-center rounded-xl border border-purple-400/15 bg-[#111117] px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80">
                    <Image src="/images/DMCA.png" alt="DMCA Protected" width={150} height={75} className="h-auto max-h-[44px] w-auto max-w-full object-contain" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {hasBottomFooterLinks ? (
          <section data-footer-partners aria-label={bottomFooterMenu.heading} className="mt-6 border-t border-white/[0.06] pt-6 text-center">
            <h4 className="mb-5 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-[11px] font-semibold uppercase tracking-[0.24em] text-transparent xl:text-xs">
              {bottomFooterMenu.heading}
            </h4>
            <div className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#0e0e0e] to-transparent" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#0e0e0e] to-transparent" aria-hidden="true" />
              <div data-footer-partner-rail className="footer-partner-rail w-full overflow-x-auto py-1">
                <div data-footer-partner-track className="flex w-max min-w-full items-center justify-center gap-8 px-5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 xl:text-xs">
                  {bottomFooterMenu.links.map((link) => (
                    <a key={link.id} href={link.url || '#'} className="shrink-0 whitespace-nowrap rounded-sm transition-colors duration-200 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 motion-reduce:transition-none">
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section data-footer-legal className="mt-8 border-t border-white/[0.06] pt-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl text-left text-[11px] leading-[1.7] text-zinc-500 xl:text-xs">
              <p className="mb-3 font-medium">Copyright © 2026 - All rights reserved by TrucTiepGAME</p>
              <p>
                CÔNG TY TNHH ĐẦU TƯ VÀ THƯƠNG MẠI PCM<br />
                Giấy phép Chứng nhận đăng ký doanh nghiệp số: 0110441021 do Sở Kế hoạch và đầu tư thành phố Hà Nội (Nay là Sở Tài chính thành phố Hà Nội) cấp lần đầu ngày: 07/08/2023; thay đổi lần thứ nhất ngày: 05/07/2024<br />
                Trụ sở: Số 83-85 Thái Hà, Phường Trung Liệt, Quận Đống Đa, Thành phố Hà Nội, Việt Nam
              </p>
            </div>
            <PaymentMarks />
          </div>
        </section>

        <div className="mt-8 mb-8 md:mb-0 border-t border-white/[0.06] pt-6 text-center text-xs font-medium text-zinc-600 xl:text-[13px]">
          Build PC <span className="mx-1 text-red-500" aria-label="yêu">❤️</span> anh em nhóaaa !!!
        </div>
      </div>

      <style jsx>{`
        .footer-partner-rail {
          scrollbar-width: none;
          overscroll-behavior-inline: contain;
        }

        .footer-partner-rail::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </footer>
  );
}
