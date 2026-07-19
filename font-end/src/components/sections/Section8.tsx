import ProductGridCard, { type ProductGridCardData } from "../ProductGridCard";

export const section8FeaturedCollectionConfig = {
  collectionId: 896,
  collectionSlug: "goi-y-cho-ban",
  title: "Gợi ý cho bạn",
  viewAllLabel: "Xem tất cả",
  productLimit: 10,
} as const;

export type Section8FeaturedCollection = {
  collection: {
    id: number;
    name: string;
    url: string;
  };
  products: ProductGridCardData[];
};

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
      <section className="section-8 pb-10 bg-dark-200" id="section-8">
        <div className="max-w-[1800px] mx-auto sm:px-6 lg:px-8">

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
                {products.map((product) => (
                  <div className="section-8-carousel-item" key={product.id}>
                    <ProductGridCard product={product} />
                  </div>
                ))}
              </div>{/*  /carousel-track  */}
            </div>{/*  /carousel-wrapper  */}

          </div>{/*  /trending-section  */}

        </div>
      </section>

      {/*  END section-8  */}
    </>
  );
}
