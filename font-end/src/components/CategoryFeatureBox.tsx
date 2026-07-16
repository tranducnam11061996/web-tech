export type CategoryFeatureBoxData = {
  categoryId: number;
  homepageEnabled?: boolean;
  categoryPageEnabled?: boolean;
  boxPosition?: "left" | "right";
  renderMode?: "image" | "hybrid";
  backgroundImageUrl?: string;
  mobileBackgroundImageUrl?: string;
  targetUrl?: string;
  headline?: string;
  subheading?: string;
  ctaLabel?: string;
  textColor?: string;
  overlayColor?: string;
  containerBackgroundColor?: string;
  buttonStyle?: {
    backgroundColor?: string;
    textColor?: string;
  };
};

const API_URL = "";

function resolveMediaUrl(value: string | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/api/media/")) return `${API_URL}${raw}`;
  if (raw.startsWith("/")) return raw;
  if (raw.includes("/")) return `${API_URL}/api/media/${raw.split("/").map(encodeURIComponent).join("/")}`;
  return `https://hacom.vn/media/category/${encodeURIComponent(raw)}`;
}

export function safeCategoryFeatureColor(value: string | undefined, fallback: string) {
  const raw = String(value || "").trim();
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(raw) ? raw : fallback;
}

function resolveTargetUrl(value: string | undefined) {
  const raw = String(value || "").trim();
  if (!raw || /^(?:javascript|data):/i.test(raw) || raw.startsWith("//")) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) return raw;
  return `/${raw.replace(/^\/+/, "")}`;
}

export default function CategoryFeatureBox({
  featureBox,
  className = "",
  showCta = true,
}: {
  featureBox: CategoryFeatureBoxData | null | undefined;
  className?: string;
  showCta?: boolean;
}) {
  if (!featureBox?.backgroundImageUrl || !featureBox.targetUrl) return null;

  const targetUrl = resolveTargetUrl(featureBox.targetUrl);
  if (!targetUrl) return null;

  const desktopImage = resolveMediaUrl(featureBox.backgroundImageUrl);
  const mobileImage = resolveMediaUrl(featureBox.mobileBackgroundImageUrl) || desktopImage;
  const renderMode = featureBox.renderMode === "image" ? "image" : "hybrid";
  const textColor = safeCategoryFeatureColor(featureBox.textColor, "#ffffff");
  const overlayColor = safeCategoryFeatureColor(featureBox.overlayColor, "#07111f");
  const buttonBackground = safeCategoryFeatureColor(featureBox.buttonStyle?.backgroundColor, "#ffffff");
  const buttonTextColor = safeCategoryFeatureColor(featureBox.buttonStyle?.textColor, "#0f172a");
  const contentOnRight = featureBox.boxPosition === "left";

  return (
    <a
      href={targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-category-feature-box
      data-box-position={featureBox.boxPosition === "right" ? "right" : "left"}
      data-content-position={contentOnRight ? "right" : "left"}
      className={`group relative isolate flex min-h-[220px] overflow-hidden rounded-2xl border border-white/10 bg-[#07111f] shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:shadow-[0_22px_70px_rgba(6,182,212,0.16)] ${className}`}
      style={{ backgroundColor: overlayColor }}
    >
      <picture>
        <source media="(max-width: 640px)" srcSet={mobileImage} />
        <img
          src={desktopImage}
          alt={featureBox.headline || "Category feature"}
          className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-[1.035]"
          loading="lazy"
        />
      </picture>
      <span className={`absolute inset-0 ${contentOnRight ? "bg-gradient-to-l" : "bg-gradient-to-r"} from-black/70 via-black/30 to-transparent`} aria-hidden="true" />

      {renderMode === "hybrid" && (
        <span
          className={`relative z-10 flex max-w-[72%] flex-col justify-center p-6 sm:p-7 ${contentOnRight ? "ml-auto items-end text-right" : "mr-auto items-start text-left"}`}
          style={{ color: textColor }}
        >
          {featureBox.subheading && (
            <span data-feature-subheading className="mb-4 line-clamp-2 text-base font-bold uppercase leading-relaxed tracking-[0.12em] opacity-85 sm:text-lg">
              {featureBox.subheading}
            </span>
          )}
          <strong data-feature-headline className="line-clamp-2 whitespace-pre-line text-4xl font-black uppercase leading-[0.88] tracking-[-0.035em] sm:text-5xl 2xl:text-6xl">
            {featureBox.headline || "Upgrade bundles"}
          </strong>
          {showCta && (
            <span
              data-feature-cta
              className="mt-6 inline-flex w-fit items-center gap-3 rounded-full px-5 py-3 text-sm font-black uppercase tracking-wide transition group-hover:translate-x-1"
              style={{ backgroundColor: buttonBackground, color: buttonTextColor }}
            >
              {featureBox.ctaLabel || "Shop now"}
              <span aria-hidden="true">→</span>
            </span>
          )}
        </span>
      )}
    </a>
  );
}
