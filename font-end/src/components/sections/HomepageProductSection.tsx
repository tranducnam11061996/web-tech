import type { CSSProperties } from "react";
import Link from "next/link";
import FavoriteButton from "../FavoriteButton";
import ProductCardLink from "../ProductCardLink";
import ProductGridCard, { type ProductGridCardData } from "../ProductGridCard";
import { SHOW_PRODUCT_CARD_FAVORITES } from "@/lib/storefrontFeatureFlags";

export type HomepageProductSectionTitleLine = {
  text: string;
  className?: string;
  style?: CSSProperties;
};

export type HomepageProductSectionConfig = {
  sectionId: "section-6" | "section-10" | "section-17";
  categoryId: number;
  productLimit: number;
  ctaTitleLines: HomepageProductSectionTitleLine[];
  ctaButtonLabel: string;
  productCardVariant?: "legacy" | "shared-grid";
};

export type HomepageProductSectionCategory = {
  id: number;
  name: string;
  slug: string;
};

export type HomepageProductSectionProduct = ProductGridCardData;

export type HomepageProductSectionData = {
  category: HomepageProductSectionCategory;
  products: HomepageProductSectionProduct[];
};

export type HomepageProductSectionsPromise = Promise<HomepageProductSectionData[]>;

type HomepageProductSectionProps = {
  config: HomepageProductSectionConfig;
  sectionDataPromise: HomepageProductSectionsPromise;
};

function normalizeSlug(value: unknown) {
  return String(value || "").replace(/^\/+/, "");
}

function getCategoryHref(config: HomepageProductSectionConfig, category?: HomepageProductSectionCategory) {
  const slug = normalizeSlug(category?.slug);
  return slug ? `/${slug}` : `/category?id=${config.categoryId}`;
}

function getProductHref(product: HomepageProductSectionProduct) {
  const slug = normalizeSlug(product.slug);
  return slug ? `/${slug}` : `/product-${product.id}`;
}

function formatPrice(value: unknown) {
  const price = Number(value || 0);
  if (!Number.isFinite(price) || price <= 0) return null;
  return new Intl.NumberFormat("vi-VN").format(Math.round(price));
}

function renderCtaTitle(lines: HomepageProductSectionTitleLine[]) {
  return lines.map((line, index) => (
    <span key={`${line.text}-${index}`} className={line.className} style={line.style}>
      {index > 0 ? <br /> : null}
      {line.text}
    </span>
  ));
}

function ProductCard({ product }: { product: HomepageProductSectionProduct }) {
  const priceText = formatPrice(product.price);
  const brand = product.brand || "TrucTiepGAME";
  const productName = product.name || "Sản phẩm";

  return (
    <article className="product-card relative">
      {SHOW_PRODUCT_CARD_FAVORITES ? <FavoriteButton productId={Number(product.id)} /> : null}
      <ProductCardLink className="product-card-link flex h-full flex-1 flex-col" href={getProductHref(product)} title={productName}>
        <div className="product-img product-card-image-frame">
          {product.thumbnail ? (
            <img
              src={product.thumbnail}
              alt={productName}
              loading="lazy"
              className="h-full w-full object-contain object-center"
            />
          ) : (
            <span className="placeholder-text">{productName}</span>
          )}
        </div>
        <div className="product-info">
          <span className="product-brand">{brand}</span>
          <span className="product-name">{productName}</span>
          <div className="product-footer">
            <span className="product-price">
              {priceText ? (
                <>
                  {priceText} <span>&#8363;</span>
                </>
              ) : (
                "Liên hệ"
              )}
            </span>
            <div className="product-menu">
              <span>&#8942;</span>
            </div>
          </div>
        </div>
      </ProductCardLink>
    </article>
  );
}

export default async function HomepageProductSection({
  config,
  sectionDataPromise,
}: HomepageProductSectionProps) {
  if (!config.categoryId) return null;

  const sections = await sectionDataPromise;
  const sectionData = sections.find((section) => section.category.id === config.categoryId);
  const products = (sectionData?.products || []).slice(0, config.productLimit);

  if (!sectionData || products.length === 0) return null;

  const carouselContainerId = `${config.sectionId}-carousel-container`;
  const carouselTrackId = `${config.sectionId}-carousel-track`;

  return (
    <>
      {/*  START dynamic homepage product section  */}
      <section className={`${config.sectionId} py-10 bg-dark-200`} id={config.sectionId}>
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="gift-section">
            <div className="gift-layout flex-stretch">
              <div className="cta-panel">
                <h2 className="cta-title">{renderCtaTitle(config.ctaTitleLines)}</h2>
                <Link className="cta-button" href={getCategoryHref(config, sectionData.category)}>
                  {config.ctaButtonLabel}
                </Link>

                <div className="star-deco star-deco--right-40"></div>
              </div>

              <div className="carousel-wrapper" id={carouselContainerId}>
                <div className="carousel-track" id={carouselTrackId}>
                  {products.map((product) =>
                    config.productCardVariant === "shared-grid" ? (
                      <div className="homepage-product-carousel-item" key={product.id}>
                        <ProductGridCard product={product} />
                      </div>
                    ) : (
                      <ProductCard key={product.id} product={product} />
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/*  END dynamic homepage product section  */}
    </>
  );
}
