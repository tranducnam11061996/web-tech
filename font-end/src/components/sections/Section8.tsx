export const section8FeaturedCollectionConfig = {
  collectionId: 896,
  collectionSlug: "goi-y-cho-ban",
  title: "Gợi ý cho bạn",
  viewAllLabel: "Xem tất cả",
  productLimit: 10,
} as const;

export type Section8ProductBadge = {
  id: string;
  text: string;
  slot: "image_top_left" | "image_bottom_center";
  colorVariant?: "red" | "blue" | "cyan" | "green" | "amber" | "purple" | "slate";
  ordering?: number;
};

export type Section8CarouselProduct = {
  id: number;
  name: string;
  sku: string;
  price: number;
  marketPrice: number;
  thumbnail: string;
  slug: string;
  brand: string;
  cardBadges: Section8ProductBadge[];
};

export type Section8FeaturedCollection = {
  collection: {
    id: number;
    name: string;
    url: string;
  };
  products: Section8CarouselProduct[];
};

const PRICE_FORMATTER = new Intl.NumberFormat("vi-VN");
const BADGE_VARIANT_CLASSES: Record<NonNullable<Section8ProductBadge["colorVariant"]>, string> = {
  red: "spec-cpu",
  blue: "spec-ram",
  cyan: "spec-ssd",
  green: "spec-gpu",
  amber: "spec-cpu",
  purple: "spec-screen",
  slate: "spec-ssd",
};

function formatPrice(value: unknown) {
  const price = Number(value || 0);
  if (!Number.isFinite(price) || price <= 0) return "Liên hệ";
  return `${PRICE_FORMATTER.format(Math.round(price))} ₫`;
}

function badgeClassName(badge: Section8ProductBadge) {
  return `spec-badge ${badge.colorVariant ? BADGE_VARIANT_CLASSES[badge.colorVariant] : "spec-ssd"}`;
}

export default function Section8({
  featuredCollection,
}: {
  featuredCollection?: Section8FeaturedCollection | null;
}) {
  const config = section8FeaturedCollectionConfig;
  const collectionMatchesConfig = featuredCollection
    && featuredCollection.collection.id === config.collectionId
    && featuredCollection.collection.url === config.collectionSlug;
  const products = collectionMatchesConfig
    ? featuredCollection.products.slice(0, config.productLimit)
    : [];

  if (products.length === 0) return null;

  return (
    <>
      {/*  START section-8  */}
      <section className="section-8 py-10 bg-dark-200" id="section-8">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">

          {/*  Trending Products Section  */}
          <div className="trending-section">

            {/*  Section Header  */}
            <div className="section-header">
              <h2 className="section-title">{config.title}</h2>
              <div className="header-actions">
                <button type="button" className="nav-arrow" id="prevBtn" aria-label="Sản phẩm trước">←</button>
                <button type="button" className="nav-arrow" id="nextBtn" aria-label="Sản phẩm tiếp theo">→</button>
                <a href={`/collection/${config.collectionSlug}`} className="view-all-btn">{config.viewAllLabel}</a>
              </div>
            </div>

            {/*  Carousel  */}
            <div className="carousel-wrapper" id="carouselContainer">
              <div className="carousel-track" id="carouselTrack">
                {products.map((product) => {
                  const topBadges = product.cardBadges
                    .filter((badge) => badge.slot === "image_top_left")
                    .sort((left, right) => Number(left.ordering || 0) - Number(right.ordering || 0));
                  const bottomBadge = product.cardBadges
                    .filter((badge) => badge.slot === "image_bottom_center")
                    .sort((left, right) => Number(left.ordering || 0) - Number(right.ordering || 0))[0];

                  return (
                    <div className="product-card" key={product.id}>
                      <div className="product-img">
                        {topBadges.length > 0 ? (
                          <div className="spec-badges">
                            {topBadges.map((badge) => (
                              <span className={badgeClassName(badge)} key={badge.id}>{badge.text}</span>
                            ))}
                          </div>
                        ) : null}
                        {bottomBadge ? <div className="gpu-badge">{bottomBadge.text}</div> : null}
                        <div className="placeholder-box">
                          <img
                            src={product.thumbnail}
                            alt={product.name}
                            loading="lazy"
                            draggable={false}
                            className="h-full w-full object-contain object-center"
                          />
                        </div>
                      </div>
                      <div className="tag-row"></div>
                      <div className="product-info">
                        <span className="product-name">{product.name}</span>
                        <div className="product-footer">
                          <span className="product-price">{formatPrice(product.price)}</span>
                          <div className="product-menu"><span>⋮</span></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>{/*  /carousel-track  */}
            </div>{/*  /carousel-wrapper  */}

          </div>{/*  /trending-section  */}

        </div>
      </section>

      {/*  END section-8  */}
    </>
  );
}
