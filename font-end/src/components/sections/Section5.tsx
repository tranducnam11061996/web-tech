import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

const SECTION_5_CARDS = [
  {
    id: "laptop-deals",
    eyebrow: "Back to School",
    title: ["Laptop", "Deals"],
    cta: "Xem ngay",
    href: "/laptop",
    image: "/images/section-5/laptop-deals.avif",
    alt: "Gaming laptop deals",
    accent: "#00d4ff",
    gradient: "linear-gradient(135deg, #0a1a2d 0%, #0d2233 52%, #0a1929 100%)",
    placement: "order-1 lg:order-none lg:col-start-1 lg:row-start-1",
    featured: false,
  },
  {
    id: "prebuilt-pc",
    eyebrow: "Cấu hình tối ưu",
    title: ["Build", "PC Gaming"],
    cta: "Chọn cấu hình",
    href: "/bo-pc-gaming-livestream.html",
    image: "/images/section-5/prebuilt-pc.avif",
    alt: "Pre-built gaming PC",
    accent: "#ff1a1a",
    gradient: "linear-gradient(135deg, #2d0a0a 0%, #1a0505 52%, #0f0303 100%)",
    placement: "order-3 row-span-2 lg:order-none lg:col-start-2 lg:row-start-1",
    featured: true,
  },
  {
    id: "graphics-cards",
    eyebrow: "Sẵn kho - Giá tốt",
    title: ["VGA", "Gaming"],
    cta: "Mua ngay",
    href: "/vga-card-man-hinh.html",
    image: "/images/section-5/graphics-cards.avif",
    alt: "Gaming graphics cards",
    accent: "#ff6eb4",
    gradient: "linear-gradient(135deg, #2d0a20 0%, #1a0512 52%, #0f030a 100%)",
    placement: "order-2 lg:order-none lg:col-start-3 lg:row-start-1",
    featured: false,
  },
  {
    id: "upgrade-kits",
    eyebrow: "Chính hãng - Giá tốt",
    title: ["Nâng cấp", "Linh Kiện"],
    cta: "Chọn ngay",
    href: "/linh-kien-may-tinh.html",
    image: "/images/section-5/upgrade-kits.avif",
    alt: "PC upgrade kits",
    accent: "#8b5cf6",
    gradient: "linear-gradient(135deg, #1a0a2d 0%, #0f0519 52%, #0a030f 100%)",
    placement: "order-4 lg:order-none lg:col-start-1 lg:row-start-2",
    featured: false,
  },
  {
    id: "monitor-deals",
    eyebrow: "Nét căng – Mượt mà",
    title: ["Màn hình", "GAMING"],
    cta: "Xem ngay",
    href: "/monitor-man-hinh.html",
    image: "/images/section-5/monitor-deals.avif",
    alt: "Gaming monitor deals",
    accent: "#b8ff00",
    gradient: "linear-gradient(135deg, #0a2d1a 0%, #05190f 52%, #030f0a 100%)",
    placement: "order-5 lg:order-none lg:col-start-3 lg:row-start-2",
    featured: false,
  },
] as const;

type Section5Style = CSSProperties & {
  "--section5-accent": string;
};

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export default function Section5() {
  return (
    <section
      id="section-5"
      aria-labelledby="section-5-title"
      className="w-full bg-[#111212] px-4 py-4 md:px-8 md:pb-7 md:pt-6 xl:px-[60px]"
    >
      <div
        data-section5-grid
        className="mx-auto grid max-w-[1800px] grid-cols-2 gap-3 md:auto-rows-[220px] md:gap-4 lg:aspect-[1920/647] lg:grid-cols-3 lg:grid-rows-2 lg:auto-rows-auto lg:gap-[30px]"
      >
        {SECTION_5_CARDS.map((card) => {
          const cardStyle: Section5Style = {
            "--section5-accent": card.accent,
          };

          return (
            <Link
              key={card.id}
              href={card.href}
              data-section5-card={card.id}
              data-section5-featured={card.featured ? "true" : undefined}
              style={cardStyle}
              className={`${card.placement} group relative isolate block overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--section5-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] ${card.featured ? "" : "aspect-video md:aspect-auto"}`}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover:scale-[1.025] motion-safe:group-focus-visible:scale-[1.025]"
                style={{ backgroundImage: card.gradient }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 bg-[var(--section5-accent)] opacity-70 motion-safe:transition-opacity motion-safe:duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20 rounded-2xl opacity-0 shadow-[inset_0_0_0_1px_var(--section5-accent)] motion-safe:transition-opacity motion-safe:duration-200 group-hover:opacity-50 group-focus-visible:opacity-50"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-1/2 left-[10%] h-3/5 w-4/5 rounded-full bg-[var(--section5-accent)] opacity-20 blur-[60px] motion-safe:transition-opacity motion-safe:duration-200 group-hover:opacity-35 group-focus-visible:opacity-35 md:opacity-15"
              />

              {card.featured ? (
                <>
                  <span
                    aria-hidden="true"
                    data-section5-featured-line
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden h-0.5 bg-[var(--section5-accent)] opacity-0 shadow-[0_0_12px_var(--section5-accent)] motion-safe:transition-opacity motion-safe:duration-200 group-hover:opacity-90 group-focus-visible:opacity-90 lg:block"
                  />
                  <span
                    aria-hidden="true"
                    data-section5-featured-dots
                    className="pointer-events-none absolute inset-x-0 bottom-2 z-20 hidden opacity-0 motion-safe:transition-opacity motion-safe:duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 lg:block"
                  >
                    {[15, 30, 50, 70, 85].map((left, index) => (
                      <span
                        key={left}
                        className={`absolute bottom-0 rounded-full bg-[var(--section5-accent)] shadow-[0_0_7px_var(--section5-accent)] ${index % 2 === 0 ? "h-1.5 w-1.5" : "h-1 w-1"}`}
                        style={{ left: `${left}%` }}
                      />
                    ))}
                  </span>
                </>
              ) : null}

              <span className="relative z-10 flex h-full flex-col justify-between p-3 md:p-6 lg:p-8">
                <span>
                  <span
                    data-section5-eyebrow
                    className="inline-flex items-center gap-1.5 text-[8px] font-semibold uppercase leading-none tracking-[0.15em] text-white/60 md:text-xs md:opacity-0 motion-safe:transition-opacity motion-safe:duration-200 lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100"
                  >
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--section5-accent)] md:h-2 md:w-2" />
                    {card.eyebrow}
                  </span>
                  <span
                    className={`mt-1 block font-main font-extrabold uppercase leading-[1.05] tracking-tight text-white/75 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1 md:mt-2 ${card.featured ? "text-[17px] md:text-4xl lg:text-[clamp(2rem,2vw,3rem)]" : "text-sm md:text-3xl lg:text-[clamp(1.75rem,1.6vw,2.5rem)]"}`}
                  >
                    <span className="block">{card.title[0]}</span>
                    <span className="block">{card.title[1]}</span>
                  </span>
                </span>

                <span
                  className={`pointer-events-none absolute motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover:scale-[1.06] motion-safe:group-hover:-translate-y-1 motion-safe:group-focus-visible:scale-[1.06] motion-safe:group-focus-visible:-translate-y-1 ${card.featured ? "bottom-[2%] left-1/2 h-[62%] w-[70%] -translate-x-1/2 sm:w-[85%] md:w-[90%] lg:bottom-[5%] lg:h-[65%] lg:w-[95%]" : "bottom-0 right-[10%] h-[60%] w-[35%] sm:h-[72%] sm:w-[65%] md:h-[72%] md:w-[65%] lg:right-2 lg:h-[70%] lg:w-[50%] xl:h-[85%] xl:w-[60%]"}`}
                >
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    sizes={card.featured
                      ? "(max-width: 767px) 65vw, (max-width: 1023px) 45vw, 570px"
                      : "(max-width: 767px) 35vw, (max-width: 1023px) 32vw, 350px"}
                    className="object-contain object-bottom drop-shadow-2xl"
                  />
                </span>

                <span
                  data-section5-cta
                  className={`relative z-10 hidden w-fit items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3 font-main text-sm font-semibold uppercase tracking-wider text-white motion-safe:transition-[transform,background-color,border-color] motion-safe:duration-200 group-hover:border-[var(--section5-accent)] group-hover:bg-white/10 group-focus-visible:border-[var(--section5-accent)] group-focus-visible:bg-white/10 md:inline-flex ${card.featured ? "px-6" : ""}`}
                >
                  {card.cta}
                  <ArrowIcon />
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
