import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

const SECTION_9_CARDS = [
  {
    id: "gaming-headsets",
    title: ["Tai Nghe", "Gaming"],
    href: "/tai-nghe-choi-game.html",
    image: "/images/section-9/gaming-headsets.avif",
    alt: "Tai nghe gaming",
    accent: "#6366f1",
    mobileSpan: "col-span-3",
    mobileAspect: "aspect-[3/2]",
  },
  {
    id: "gaming-keyboards",
    title: ["Bàn Phím", "Gaming"],
    href: "/ban-phim-choi-game.html",
    image: "/images/section-9/gaming-keyboards.avif",
    alt: "Bàn phím gaming",
    accent: "#ec4899",
    mobileSpan: "col-span-3",
    mobileAspect: "aspect-[3/2]",
  },
  {
    id: "gaming-mouse",
    title: ["Chuột", "Gaming"],
    href: "/chuot-choi-game.html",
    image: "/images/section-9/gaming-mouse.avif",
    alt: "Chuột gaming",
    accent: "#f59e0b",
    mobileSpan: "col-span-2",
    mobileAspect: "aspect-[25/23]",
  },
  {
    id: "gaming-chairs",
    title: ["Ghế", "Gaming"],
    href: "/ghe-choi-game.html",
    image: "/images/section-9/ghe.png",
    alt: "Ghế gaming",
    accent: "#10b981",
    mobileSpan: "col-span-2",
    mobileAspect: "aspect-[25/23]",
  },
  {
    id: "computer-speakers",
    title: ["Loa", "Máy Tính"],
    href: "/loa-may-tinh.html",
    image: "/images/section-9/loa.png",
    alt: "Loa máy tính",
    accent: "#06b6d4",
    mobileSpan: "col-span-2",
    mobileAspect: "aspect-[25/23]",
  },
] as const;

type Section9AccentStyle = CSSProperties & {
  "--section9-accent": string;
};

export default function Section9() {
  return (
    <section
      id="section-9"
      aria-label="Danh mục thiết bị gaming nổi bật"
      className="w-full bg-[#111212] py-3 md:px-8 md:py-6 xl:px-[60px]"
    >
      <div
        data-section9-grid
        className="mx-auto grid max-w-[1800px] grid-cols-6 gap-3 px-4 sm:px-6 md:grid-cols-3 md:gap-4 md:px-0 lg:gap-[30px] min-[1500px]:max-w-[1700px] min-[1500px]:grid-cols-5"
      >
        {SECTION_9_CARDS.map((card) => {
          const accentStyle: Section9AccentStyle = {
            "--section9-accent": card.accent,
            borderColor: `color-mix(in srgb, ${card.accent} 20%, transparent)`,
          };

          return (
            <Link
              key={card.id}
              href={card.href}
              data-section9-card={card.id}
              aria-label={`Xem ${card.alt}`}
              style={accentStyle}
              className={`${card.mobileSpan} ${card.mobileAspect} group relative isolate block overflow-hidden rounded-2xl border bg-[#181919] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--section9-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] md:col-span-1 md:aspect-[5/6]`}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 rounded-full bg-[var(--section9-accent)]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(80%_50%_at_20%_20%,rgba(255,255,255,0.08)_0%,transparent_50%)]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-3 left-1/2 h-2/5 w-3/4 -translate-x-1/2 rounded-full opacity-25 blur-[60px] motion-safe:transition-opacity motion-safe:duration-200 group-hover:opacity-40 group-focus-visible:opacity-40 md:bottom-8"
                style={{
                  background: `radial-gradient(circle, color-mix(in srgb, ${card.accent} 20%, transparent) 0%, transparent 60%)`,
                }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 shadow-[inset_0_0_0_1px_var(--section9-accent)] motion-safe:transition-opacity motion-safe:duration-200 group-hover:opacity-25 group-focus-visible:opacity-25"
              />

              <span className="relative z-10 flex h-full flex-col px-2.5 pt-2.5 md:p-5 lg:p-6">
                <span
                  data-section9-title
                  className="text-center text-[14px] font-extrabold uppercase leading-[16px] text-white/80 md:text-left md:text-2xl md:leading-[1.05] md:text-white/70 min-[1500px]:text-[28px]"
                >
                  <span className="block">{card.title[0]}</span>
                  <span className="block">{card.title[1]}</span>
                </span>

                <span
                  data-section9-artwork
                  className="pointer-events-none absolute bottom-1 left-1/2 h-[55%] w-[80%] -translate-x-1/2 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03] md:bottom-6 lg:bottom-8 lg:h-[62%] lg:w-[87%]"
                >
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    sizes="(max-width: 767px) 48vw, (max-width: 1499px) 33vw, (max-width: 1819px) calc((100vw - 240px) / 5), 316px"
                    className="object-contain object-bottom drop-shadow-2xl"
                  />
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
