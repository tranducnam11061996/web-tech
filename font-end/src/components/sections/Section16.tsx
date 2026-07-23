import type { CSSProperties } from "react";
import type { NewsItem } from "../../lib/news";

const FALLBACK_BACKGROUNDS = [
  "bg-best-sellers",
  "bg-perfect-gift",
  "bg-intel",
  "bg-ryzen",
  "bg-radeon",
  "bg-extra",
] as const;

function newsBackgroundStyle(thumbnail: string): CSSProperties | undefined {
  if (!thumbnail) return undefined;
  return {
    backgroundImage: `url("${encodeURI(thumbnail)}")`,
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
}

export default function Section16({ articles = [] }: { articles?: NewsItem[] }) {
  const featuredArticles = articles
    .filter((article) => Number(article.id) > 0 && article.title.trim() && article.url.trim())
    .slice(0, 10);

  if (featuredArticles.length === 0) return null;

  return (
    <>
      {/*  START section-16  */}
      <section className="section-16 carousel-section" id="section-16">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="carousel-container" id="carouselContainer">

            <div className="carousel-track" id="carouselTrack">
              {featuredArticles.map((article, index) => {
                const hasThumbnail = Boolean(article.thumnail);
                const categoryName = article.category_name?.trim() || "Tin tức";
                return (
                  <div className="promo-card" data-section16-card data-news-id={article.id} key={article.id}>
                    <div
                      className={`promo-img-wrapper ${FALLBACK_BACKGROUNDS[index % FALLBACK_BACKGROUNDS.length]}`}
                      style={newsBackgroundStyle(article.thumnail)}
                      aria-hidden="true"
                    >
                      <div className="promo-img-text">{hasThumbnail ? "" : article.title}</div>
                    </div>
                    <div className="promo-content">
                      <h3 className="promo-title" title={article.title}>{article.title}</h3>
                      <p className="promo-desc">{article.summary || ""}</p>
                      <div className="promo-actions">
                        <span className="promo-category-tag" title={categoryName}>{categoryName}</span>
                        <a
                          href={`/tin-tuc/${article.url.replace(/^\/+/, "")}`}
                          className="promo-link"
                          aria-label={`Xem thêm: ${article.title}`}
                        >
                          ✦ Xem thêm →
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="carousel-indicators" id="indicators">
              <div className="indicator-dot active"></div>
              <div className="indicator-dot"></div>
              <div className="indicator-dot"></div>
            </div>

          </div>
        </div>
      </section>

      {/*  END section-16  */}
    </>
  );
}
