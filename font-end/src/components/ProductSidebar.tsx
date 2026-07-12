"use client";

import {
  BadgePercent,
  Banknote,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Flame,
  Globe,
  Gift,
  Headphones,
  Keyboard,
  MapPin,
  MessageCircle,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Truck,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { addCartItem, clampQuantity } from "@/lib/cart";
import { sanitizeLegacyHtml } from "@/lib/sanitizeHtml";
import type { ProductDetailData, ProductVoucherSummary } from "@/types/product-detail";
import ProgressiveImage from "./ProgressiveImage";
import ProductBundleModal, { BundleProduct } from "./ProductBundleModal";
import ProductComboBuilder from "./ProductComboBuilder";
import ProductGroupSelector from "./ProductGroupSelector";

const ProductVoucherModal = dynamic(() => import("./ProductVoucherModal"), { ssr: false });

const voucherMoney = (value: number) => `${new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value || 0)))}đ`;
const voucherExpiry = (value: string | null) => value
  ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value))
  : "Không giới hạn";
const voucherBadgeValue = (voucher: ProductVoucherSummary) => {
  if (voucher.discountType === "percent") return `${voucher.discountValue}%`;
  if (voucher.discountValue >= 1_000_000 && voucher.discountValue % 1_000_000 === 0) return `${voucher.discountValue / 1_000_000}TR`;
  if (voucher.discountValue >= 1_000 && voucher.discountValue % 1_000 === 0) return `${voucher.discountValue / 1_000}K`;
  return voucherMoney(voucher.discountValue);
};
const voucherSummary = (voucher: ProductVoucherSummary) => {
  const parts = [voucher.discountType === "percent" ? `Giảm ${voucher.discountValue}%` : `Giảm ${voucherMoney(voucher.discountValue)}`];
  if (voucher.discountType === "percent" && voucher.maxDiscount) parts[0] += ` tối đa ${voucherMoney(voucher.maxDiscount)}`;
  if (voucher.description && voucher.description.trim().toLocaleLowerCase("vi-VN") !== voucher.title.trim().toLocaleLowerCase("vi-VN")) parts.push(voucher.description);
  if (voucher.minimumOrderValue > 0) parts.push(`đơn từ ${voucherMoney(voucher.minimumOrderValue)}`);
  return parts.join(", ");
};

type BundleItem = {
  id: string;
  title: string;
  promoText: string;
  price: number;
  discount: number;
  imageUrl: string;
  displayPrice?: string;
  displayOriginalPrice?: string;
};

type BundleDemoItem = {
  id: string;
  imageUrl: string;
  name: string;
  salePrice: string;
  originalPrice: string;
  quantity: number;
};

const BUNDLE_ITEMS: BundleItem[] = [
  {
    id: "bundle-1",
    title: "Giảm đến 15% mua kèm tai nghe Sony",
    promoText: "Giảm thêm 15%",
    price: 690_000,
    discount: 105_000,
    imageUrl: "https://placehold.co/80x80/ffffff/333333?text=Tai+nghe",
  },
  {
    id: "bundle-2",
    title: "Mua kèm sim giảm thêm 50K",
    promoText: "Giảm tối đa 50.000đ",
    price: 150_000,
    discount: 50_000,
    imageUrl: "https://placehold.co/80x80/ffffff/333333?text=Sim",
  },
  {
    id: "bundle-3",
    title: "Giảm 15% khi mua kèm loa SONY",
    promoText: "Giảm thêm 15%",
    price: 1_200_000,
    discount: 180_000,
    imageUrl: "https://placehold.co/80x80/ffffff/333333?text=Loa",
  },
  {
    id: "bundle-4",
    title: "Khăn lau màn hình Apple -... MW693ZA/A",
    promoText: "",
    displayPrice: "489.000đ",
    displayOriginalPrice: "539.000đ",
    price: 489_000,
    discount: 50_000,
    imageUrl: "https://placehold.co/80x80/ffffff/333333?text=Khan",
  },
  {
    id: "bundle-5",
    title: "Chuột không dây Logitech",
    promoText: "Giảm thêm 10%",
    price: 290_000,
    discount: 29_000,
    imageUrl: "https://placehold.co/80x80/ffffff/333333?text=Mouse",
  },
  {
    id: "bundle-6",
    title: "Bàn phím cơ DareU",
    promoText: "Giảm 100.000đ",
    price: 890_000,
    discount: 100_000,
    imageUrl: "https://placehold.co/80x80/ffffff/333333?text=Keyboard",
  },
  {
    id: "bundle-7",
    title: "Balo Laptop chống nước",
    promoText: "Giảm 20%",
    price: 450_000,
    discount: 90_000,
    imageUrl: "https://placehold.co/80x80/ffffff/333333?text=Balo",
  },
  {
    id: "bundle-8",
    title: "Đế tản nhiệt Laptop",
    promoText: "Giảm 50K",
    price: 250_000,
    discount: 50_000,
    imageUrl: "https://placehold.co/80x80/ffffff/333333?text=Tan+nhiet",
  },
];

const BUNDLE_DEMO_ITEMS: BundleDemoItem[] = [
  {
    id: "bundle-demo-headphones",
    imageUrl: "https://placehold.co/120x120/111115/d4d4d8?text=WH-1000XM5",
    name: "Tai nghe chụp tai Sony WH-1000XM5-Den",
    salePrice: "6.791.500đ",
    originalPrice: "7.990.000đ",
    quantity: 1,
  },
  {
    id: "bundle-demo-earbuds",
    imageUrl: "https://placehold.co/120x120/111115/d4d4d8?text=WF-1000XM6",
    name: "Tai nghe Sony không dây chống ồn WF-1000XM6-Bac",
    salePrice: "6.791.500đ",
    originalPrice: "7.990.000đ",
    quantity: 1,
  },
];

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value || 0)));

function ProductInformationColumn({
  productData,
}: {
  productData: ProductDetailData;
}) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([
    BUNDLE_ITEMS[0].id,
  ]);
  const [bundleDemoItems, setBundleDemoItems] = useState(BUNDLE_DEMO_ITEMS);
  const [bundleSlideIndex, setBundleSlideIndex] = useState(0);
  const itemsPerSlide = 4;
  const totalBundleSlides = Math.ceil(BUNDLE_ITEMS.length / itemsPerSlide);
  const [demoMessage, setDemoMessage] = useState("");
  const [isBundleListModalOpen, setIsBundleListModalOpen] = useState(false);

  const price = Number(productData.price || 0);
  const marketPrice = Number(productData.marketPrice || 0);
  const savings = Math.max(
    0,
    Number(productData.savings || marketPrice - price || 0),
  );
  const discountPercent =
    marketPrice > price && marketPrice > 0
      ? Math.round((savings / marketPrice) * 100)
      : 0;

  const summaryLines = useMemo(
    () =>
      (productData.proSummary || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    [productData.proSummary],
  );
  const visibleLines = summaryExpanded
    ? summaryLines
    : summaryLines.slice(0, 5);
  const selectedBundleItems = BUNDLE_ITEMS.filter((item) =>
    selectedBundleIds.includes(item.id),
  );
  const bundleOriginalTotal =
    Number(productData.price || 0) +
    selectedBundleItems.reduce((total, item) => total + item.price, 0);
  const bundleSavings = selectedBundleItems.reduce(
    (total, item) => total + item.discount,
    0,
  );
  const bundleTotal = bundleOriginalTotal - bundleSavings;
  const updateBundleDemoQuantity = (id: string, delta: number) => {
    setBundleDemoItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };
  const removeBundleDemoItem = (id: string) => {
    setBundleDemoItems((current) => current.filter((item) => item.id !== id));
  };
  const mainImage =
    typeof productData.images?.[0] === "string"
      ? productData.images[0]
      : productData.imageGroups?.product?.[0]?.url || "";

  return (
    <section
      className="product-information-column"
      aria-labelledby="product-detail-title"
    >
      <div className="product-detail-badges" aria-label="Nhãn sản phẩm">
        <span>
          <CircleDollarSign aria-hidden="true" /> Trả góp 0%
        </span>
        <span>
          <Flame aria-hidden="true" /> Bán chạy
        </span>
      </div>

      <h1 id="product-detail-title" className="product-detail-title">
        {productData.name}
      </h1>

      <div className="product-detail-meta">
        <a href="#sec-reviews" aria-label="Xem đánh giá sản phẩm">
          <strong>4.9</strong>
          <span className="product-detail-stars" aria-hidden="true">
            ★★★★★
          </span>
          <span>(128 đánh giá)</span>
        </a>
        {productData.brand && <span>Thương hiệu: {productData.brand}</span>}
        {productData.sku && <span>SKU: {productData.sku}</span>}
        {productData.views != null && <span>Lượt xem: {productData.views}</span>}
      </div>

      {summaryLines.length > 0 && (
        <div className="product-summary" id="sec-specs">
          <ul id="product-summary-list">
            {visibleLines.map((line, index) => (
              <li key={`${line}-${index}`}>
                <Check aria-hidden="true" />
                <span
                  dangerouslySetInnerHTML={{
                    __html: sanitizeLegacyHtml(line),
                  }}
                />
              </li>
            ))}
          </ul>
          {summaryLines.length > 5 && (
            <button
              type="button"
              className="product-inline-toggle"
              aria-expanded={summaryExpanded}
              aria-controls="product-summary-list"
              onClick={() => setSummaryExpanded((current) => !current)}
            >
              {summaryExpanded ? "Thu gọn thông số" : "Xem thêm thông số kỹ thuật"}
              <ChevronDown aria-hidden="true" />
            </button>
          )}
          <span className="sr-only">
            {summaryExpanded ? "Đang hiển thị đầy đủ thông số" : "Thông số đang được thu gọn"}
          </span>
        </div>
      )}

      {/* ── Mobile Price card ── */}
      <div className="purchase-price-card block lg:hidden mb-4">
        <div className="purchase-price-heading">
          <span className="purchase-price-icon-wrapper">
            <Flame aria-hidden="true" />
          </span>
          Giá khuyến mãi :
        </div>
        <div className="purchase-price-body">
          <strong className="purchase-price-main">
            {formatNumber(price)}<sup className="purchase-price-dong">đ</sup>
          </strong>
          {marketPrice > price && (
            <div className="purchase-price-savings">
              <span className="purchase-price-old">{formatNumber(marketPrice)}<sup>đ</sup></span>
              <span className="purchase-price-discount">
                Tiết kiệm: {formatNumber(savings)}<sup>đ</sup> ({discountPercent}%)
              </span>
            </div>
          )}
        </div>
      </div>

      <ProductGroupSelector productGroup={productData.productGroup} />

      <ProductComboBuilder productData={productData} />
      {false && <>
      <div className="product-bundle-card">
        <div className="product-bundle-heading">
          <span className="product-bundle-title">
            <span role="img" aria-label="hot" className="product-bundle-fire">🔥</span> Mua kèm giá sốc
          </span>
          <span 
            className="product-bundle-viewall"
            onClick={() => setIsBundleListModalOpen(true)}
            style={{ cursor: "pointer" }}
          >
            Xem tất cả <ChevronRight aria-hidden="true" />
          </span>
        </div>

        <div className="product-bundle-slider-container">
          {bundleSlideIndex > 0 && (
            <button
              type="button"
              className="product-bundle-slider-arrow is-left"
              onClick={() => setBundleSlideIndex((prev) => prev - 1)}
              aria-label="Previous bundle slide"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
          )}

          <div className="product-bundle-slider-viewport" style={{ overflow: "hidden" }}>
            <div
              className="product-bundle-slider-track"
              style={{ transform: `translateX(-${bundleSlideIndex * 100}%)` }}
            >
              {Array.from({ length: totalBundleSlides }).map((_, slideIdx) => {
                const slideItems = BUNDLE_ITEMS.slice(
                  slideIdx * itemsPerSlide,
                  (slideIdx + 1) * itemsPerSlide
                );
                return (
                  <div key={slideIdx} className="product-bundle-slide">
                    <div className="product-bundle-items">
                      {slideItems.map((item) => {
                        const selected = selectedBundleIds.includes(item.id);
                        return (
                          <div key={item.id} className="product-bundle-item">
                            <div className="product-bundle-item-image">
                              <img src={item.imageUrl} alt="" />
                            </div>
                            <div className="product-bundle-item-info">
                              <h4 className="product-bundle-item-title">{item.title}</h4>
                              <div className="product-bundle-item-bottom">
                                <div className="product-bundle-item-price-col">
                                  {item.displayPrice ? (
                                    <>
                                      <div className="product-bundle-item-sale">{item.displayPrice}</div>
                                      {item.displayOriginalPrice && <div className="product-bundle-item-original">{item.displayOriginalPrice}</div>}
                                    </>
                                  ) : (
                                    <span className="product-bundle-item-promo">{item.promoText}</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className={`product-bundle-item-btn ${selected ? "is-selected" : ""}`}
                                  onClick={() => {
                                    setSelectedBundleIds((current) =>
                                      current.includes(item.id)
                                        ? current.filter((id) => id !== item.id)
                                        : [...current, item.id],
                                    );
                                  }}
                                >
                                  {selected ? "Bỏ chọn" : "Chọn thêm"}
                                  {selected ? <Minus aria-hidden="true" /> : <Plus aria-hidden="true" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {bundleSlideIndex < totalBundleSlides - 1 && (
            <button
              type="button"
              className="product-bundle-slider-arrow is-right"
              onClick={() => setBundleSlideIndex((prev) => prev + 1)}
              aria-label="Next bundle slide"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          )}
        </div>

        {totalBundleSlides > 1 && (
          <div className="product-bundle-pagination">
            {Array.from({ length: totalBundleSlides }).map((_, idx) => (
              <span
                key={idx}
                className={`product-bundle-dot ${idx === bundleSlideIndex ? "is-active" : ""}`}
              />
            ))}
          </div>
        )}

        {bundleDemoItems.length > 0 && (
          <section className="product-bundle-demo-section" aria-label="Sản phẩm mua kèm demo">
            <p className="product-bundle-demo-heading">
              Bạn đang mua kèm {bundleDemoItems.length} sản phẩm:
            </p>
            <div className="product-bundle-demo-list">
              {bundleDemoItems.map((item) => (
                <article key={item.id} className="product-bundle-demo-item">
                  <div className="product-bundle-demo-image">
                    <img src={item.imageUrl} alt="" />
                  </div>
                  <div className="product-bundle-demo-copy">
                    <p className="product-bundle-demo-name">{item.name}</p>
                    <div className="product-bundle-demo-prices">
                      <span className="product-bundle-demo-sale">{item.salePrice}</span>
                      <span className="product-bundle-demo-original">{item.originalPrice}</span>
                    </div>
                  </div>
                  <div className="product-bundle-demo-actions">
                    <button
                      type="button"
                      className="product-bundle-demo-remove"
                      onClick={() => removeBundleDemoItem(item.id)}
                      aria-label={`Xóa ${item.name} khỏi sản phẩm mua kèm demo`}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                    <div className="product-bundle-demo-quantity" aria-label={`Số lượng ${item.name}`}>
                      <button
                        type="button"
                        onClick={() => updateBundleDemoQuantity(item.id, -1)}
                        disabled={item.quantity === 1}
                        aria-label={`Giảm số lượng ${item.name}`}
                      >
                        <Minus aria-hidden="true" />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateBundleDemoQuantity(item.id, 1)}
                        aria-label={`Tăng số lượng ${item.name}`}
                      >
                        <Plus aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="product-bundle-footer">
          <div className="product-bundle-footer-summary">
            <div className="product-bundle-total">
              <span className="product-bundle-label">Tạm tính:</span>
              <span className="product-bundle-price">{formatNumber(bundleTotal)}đ</span>
            </div>
            <div className="product-bundle-savings">
              <span className="product-bundle-label">Tiết kiệm:</span>
              <span className="product-bundle-discount">{formatNumber(bundleSavings)}đ</span>
            </div>
          </div>
          <button
            type="button"
            className="product-bundle-buy-btn"
            onClick={() =>
              setDemoMessage(
                selectedBundleIds.length > 0
                  ? "Combo đã được tính thử. Kết nối giỏ hàng sẽ phát triển ở phase sau."
                  : "Chọn ít nhất một sản phẩm mua kèm để tính combo.",
              )
            }
          >
            <ShoppingCart aria-hidden="true" /> Mua combo
          </button>
        </div>
        <p className="product-demo-message" role="status" aria-live="polite">
          {demoMessage}
        </p>
      </div>
      
      {/* Bundle Modal rendering */}
      <ProductBundleModal
        isOpen={isBundleListModalOpen}
        onClose={() => setIsBundleListModalOpen(false)}
        tabs={BUNDLE_ITEMS.map(b => b.title)}
        products={[
          {
            id: "modal-bundle-1",
            brand: "SONY",
            badge: "Giảm 11%",
            image: "https://placehold.co/100x100/ffffff/333333?text=Tai+nghe",
            specs: [
              { icon: "https://placehold.co/16x16/ffffff/333333?text=B", text: "Tắt ANC 32h" },
              { icon: "https://placehold.co/16x16/ffffff/333333?text=B", text: "Bluetooth 6.0" }
            ],
            title: "Tai nghe chống ồn không dây Sony 1000X The Collexion",
            price: "15.192.000đ",
            originalPrice: "16.990.000đ"
          },
          {
            id: "modal-bundle-2",
            brand: "SONY",
            badge: "Giảm 15%",
            image: "https://placehold.co/100x100/ffffff/333333?text=Tai+nghe",
            specs: [
              { icon: "https://placehold.co/16x16/ffffff/333333?text=B", text: "Tai nghe 40h" },
              { icon: "https://placehold.co/16x16/ffffff/333333?text=B", text: "Bluetooth 5.3" }
            ],
            title: "Tai nghe Bluetooth chụp tai Sony WH-1000XM6",
            price: "10.192.000đ",
            originalPrice: "11.990.000đ"
          },
          {
            id: "modal-bundle-3",
            brand: "SONY",
            badge: "Giảm 15%",
            image: "https://placehold.co/100x100/ffffff/333333?text=Tai+nghe",
            specs: [
              { icon: "https://placehold.co/16x16/ffffff/333333?text=B", text: "Bluetooth 5.3" },
              { icon: "https://placehold.co/16x16/ffffff/333333?text=B", text: "IPX4" }
            ],
            title: "Tai nghe Sony không dây chống ồn WF-1000XM6",
            price: "6.791.500đ",
            originalPrice: "7.990.000đ"
          },
          {
            id: "modal-bundle-4",
            brand: "SONY",
            badge: "Giảm 15%",
            image: "https://placehold.co/100x100/ffffff/333333?text=Tai+nghe",
            specs: [
              { icon: "https://placehold.co/16x16/ffffff/333333?text=B", text: "Tai nghe 30h" },
              { icon: "https://placehold.co/16x16/ffffff/333333?text=B", text: "Bluetooth 5.3" }
            ],
            title: "Tai nghe chụp tai Gaming Sony Inzone H9 II",
            price: "6.451.500đ",
            originalPrice: "7.590.000đ"
          },
          {
            id: "modal-bundle-5",
            brand: "SONY",
            badge: "Giảm 15%",
            image: "https://placehold.co/100x100/ffffff/333333?text=Tai+nghe",
            specs: [
              { icon: "https://placehold.co/16x16/ffffff/333333?text=B", text: "Tai nghe 40h" },
              { icon: "https://placehold.co/16x16/ffffff/333333?text=B", text: "Bluetooth 5.2" }
            ],
            title: "Tai nghe Bluetooth chụp tai Sony WH-1000XM5",
            price: "6.791.500đ",
            originalPrice: "7.990.000đ"
          }
        ]}
      />
      </>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Promotions data (matches HACOM reference design)                  */
/* ------------------------------------------------------------------ */

const FINANCE_PARTNERS = [
  { name: "HD SAISON", color: "#e21a1a" },
  { name: "FE CREDIT", color: "#e21a1a" },
  { name: "ACS", color: "#d42121" },
  { name: "HOME CREDIT", color: "#e21a1a" },
  { name: "SCB", color: "#1a3b8a" },
  { name: "mcredit", color: "#00a651" },
];

function ProductPurchaseColumn({
  productData,
}: {
  productData: ProductDetailData;
}) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [cartMessage, setCartMessage] = useState("");
  const [isVoucherListModalOpen, setIsVoucherListModalOpen] = useState(false);
  const [voucherSlideIndex, setVoucherSlideIndex] = useState(0);
  const vouchers = productData.vouchers || [];
  const productPromotions = productData.productPromotions || [];
  const [selectedVoucherForModal, setSelectedVoucherForModal] = useState<ProductVoucherSummary | null>(null);
  const vouchersPerSlide = 2;
  const totalVoucherSlides = Math.ceil(vouchers.length / vouchersPerSlide);
  const currentVoucherSlide = Math.min(voucherSlideIndex, Math.max(0, totalVoucherSlides - 1));

  const price = Number(productData.price || 0);
  const marketPrice = Number(productData.marketPrice || 0);
  const savings = Math.max(
    0,
    Number(productData.savings || marketPrice - price || 0),
  );
  const discountPercent =
    marketPrice > price && marketPrice > 0
      ? Math.round((savings / marketPrice) * 100)
      : 0;

  const getCartInput = () => {
    const currentSlug =
      typeof window !== "undefined"
        ? window.location.pathname.replace(/^\/+/, "")
        : productData.slug || `product-${productData.id}`;
    const firstImage = productData.images?.[0];

    return {
      productId: Number(productData.id),
      slug: currentSlug,
      name: productData.name || "Sản phẩm",
      sku: productData.sku || "",
      thumbnail:
        (typeof firstImage === "string" ? firstImage : firstImage?.url) ||
        productData.imageGroups?.product?.[0]?.url ||
        "https://placehold.co/300x300/111115/71717a?text=No+Image",
      price,
      marketPrice,
    };
  };

  const handleAddToCart = () => {
    addCartItem(getCartInput(), qty);
    setCartMessage(`Đã thêm ${qty} sản phẩm vào giỏ hàng`);
    window.setTimeout(() => setCartMessage(""), 2400);
  };

  const handleBuyNow = () => {
    addCartItem(getCartInput(), qty, { selectOnly: true });
    router.push("/thanh-toan");
  };

  return (
    <aside className="product-purchase-column" aria-label="Thông tin mua hàng">
      {/* ── Desktop Price card ── */}
      <div className="purchase-price-card hidden lg:block">
        <div className="purchase-price-heading">
          <span className="purchase-price-icon-wrapper">
            <Flame aria-hidden="true" />
          </span>
          Giá khuyến mãi :
        </div>
        <div className="purchase-price-body">
          <strong className="purchase-price-main">
            {formatNumber(price)}<sup className="purchase-price-dong">đ</sup>
          </strong>
          {marketPrice > price && (
            <div className="purchase-price-savings">
              <span className="purchase-price-old">{formatNumber(marketPrice)}<sup>đ</sup></span>
              <span className="purchase-price-discount">
                Tiết kiệm: {formatNumber(savings)}<sup>đ</sup> ({discountPercent}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Voucher card (real data only) ── */}
      {vouchers.length > 0 ? <div className="purchase-promo-card">
        {/* Voucher header */}
        <div className="purchase-promo-header">
          <span className="purchase-promo-title">Khuyến mãi đi kèm</span>
          <button 
            type="button" 
            className="purchase-promo-viewall"
            onClick={() => setIsVoucherListModalOpen(true)}
          >
            Xem tất cả voucher <ChevronRight aria-hidden="true" />
          </button>
        </div>

        {/* Voucher tickets */}
        <div className="purchase-voucher-slider-container">
          {currentVoucherSlide > 0 && (
            <button
              type="button"
              className="product-bundle-slider-arrow is-left"
              onClick={() => setVoucherSlideIndex((prev) => prev - 1)}
              aria-label="Xem nhóm voucher trước"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
          )}

          <div className="product-bundle-slider-viewport" style={{ overflow: "hidden" }}>
            <div
              className="product-bundle-slider-track"
              style={{ transform: `translateX(-${currentVoucherSlide * 100}%)` }}
            >
              {Array.from({ length: totalVoucherSlides }).map((_, slideIdx) => {
                const slideVouchers = vouchers.slice(
                  slideIdx * vouchersPerSlide,
                  (slideIdx + 1) * vouchersPerSlide
                );
                return (
                  <div key={slideIdx} className="product-bundle-slide">
                    <div className="purchase-voucher-row">
                      {slideVouchers.map((voucher) => (
                        <button
                          type="button"
                          key={voucher.id} 
                          className="purchase-voucher-ticket"
                          onClick={() => setSelectedVoucherForModal(voucher)}
                          aria-label={`Xem chi tiết voucher ${voucher.code}`}
                        >
                          <div className="purchase-voucher-badge">
                            <span className="purchase-voucher-badge-label">Giảm</span>
                            <span className="purchase-voucher-badge-value tabular-nums">{voucherBadgeValue(voucher)}</span>
                          </div>
                          <div className="purchase-voucher-content">
                            <div className="purchase-voucher-info">
                              <strong>{voucher.title}</strong>
                              <span>{voucherSummary(voucher)}</span>
                              <span className="purchase-voucher-expiry">
                                <span className="purchase-voucher-expiry-label">Thời hạn:</span>
                                <span className="purchase-voucher-expiry-time tabular-nums"> {voucherExpiry(voucher.endsAt)}</span>
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {currentVoucherSlide < totalVoucherSlides - 1 && (
            <button
              type="button"
              className="product-bundle-slider-arrow is-right"
              onClick={() => setVoucherSlideIndex((prev) => prev + 1)}
              aria-label="Xem nhóm voucher tiếp theo"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          )}
        </div>

      </div> : null}

      {/* ── Product promotions (real display-only data, independent from vouchers) ── */}
      {productPromotions.length > 0 ? <section className="purchase-promo-card" aria-label="Khuyến mãi theo sản phẩm">
        <div className="purchase-numbered-promos">
          {productPromotions.map((promo, index) => {
            const external = /^https:\/\//i.test(promo.detailUrl);
            return (
            <div key={promo.id} className="purchase-promo-item">
              <span className="purchase-promo-number" aria-hidden="true">{index + 1}</span>
              <span className="purchase-promo-text">
                {promo.text}{" "}
                <a href={promo.detailUrl} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="purchase-promo-detail-link">
                  Xem chi tiết
                </a>
              </span>
            </div>
          );})}
        </div>
      </section> : null}

      {/* ── Shipping card ── */}
      <div className="purchase-shipping-card">
        <div className="purchase-shipping-title">Thông tin vận chuyển</div>
        <div className="purchase-shipping-row">
          <span className="purchase-shipping-speed">
            <Truck aria-hidden="true" /> 2 Giờ
          </span>
          <span className="purchase-shipping-divider">|</span>
          <span className="purchase-shipping-desc">
            Áp dụng một số khu vực tại <strong>Hà Nội</strong>
          </span>
        </div>
        <div className="purchase-shipping-address">
          <MapPin aria-hidden="true" />
          <span>Chọn địa chỉ giao hàng để nhận ưu đãi</span>
        </div>
      </div>

      {/* ── CTA buttons ── */}
      <div className="purchase-cta-row">
        <button type="button" className="purchase-cta-installment" onClick={() => setCartMessage("Tư vấn trả góp sẽ được kết nối ở phase sau")}>
          Trả góp 0%
        </button>
        <button type="button" className="purchase-cta-buynow" onClick={handleBuyNow}>
          <strong>MUA NGAY</strong>
          <small className="hidden md:block">Giao nhanh từ 2 giờ hoặc nhận tại cửa hàng</small>
        </button>
        <button type="button" className="purchase-cta-addcart" onClick={handleAddToCart}>
          <ShoppingCart aria-hidden="true" />
          <span>Giỏ hàng</span>
        </button>
      </div>
      <p className="product-cart-message" role="status" aria-live="polite">
        {cartMessage}
      </p>

      {/* ── Payment methods ── */}
      <div className="purchase-payment-card" style={{ marginTop: "16px" }}>
        <div className="purchase-payment-header" style={{ color: "#6366f1", fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>
          Chấp nhận thanh toán:
        </div>
        <div className="purchase-payment-methods" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div className="payment-badge" style={{ background: "linear-gradient(to bottom, #ffffff, #e5e7eb)", border: "1px solid #d1d5db", borderRadius: "4px", padding: "4px 8px", display: "flex", alignItems: "center", gap: "6px", color: "#4b5563", fontSize: "12px", fontWeight: 500, lineHeight: 1.1, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
            <Banknote size={20} color="#16a34a" />
            <span>Tiền<br/>mặt</span>
          </div>
          <div className="payment-badge" style={{ background: "linear-gradient(to bottom, #ffffff, #e5e7eb)", border: "1px solid #d1d5db", borderRadius: "4px", padding: "4px 8px", display: "flex", alignItems: "center", gap: "6px", color: "#4b5563", fontSize: "12px", fontWeight: 500, lineHeight: 1.1, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
            <RefreshCw size={18} color="#2563eb" />
            <span>Chuyển<br/>khoản</span>
          </div>
          <div className="payment-badge" style={{ background: "linear-gradient(to bottom, #ffffff, #e5e7eb)", border: "1px solid #d1d5db", borderRadius: "4px", padding: "4px 8px", display: "flex", alignItems: "center", gap: "6px", color: "#4b5563", fontSize: "12px", fontWeight: 500, lineHeight: 1.1, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
            <Globe size={18} color="#60a5fa" />
            <span>Internet<br/>Banking</span>
          </div>
          <div className="payment-badge visa" style={{ background: "#fff", padding: "4px 6px", borderRadius: "2px", display: "flex", alignItems: "center" }}>
            <span style={{ color: "#1a1f71", fontWeight: 900, fontSize: "18px", fontStyle: "italic", fontFamily: "Arial, sans-serif" }}>VISA</span>
          </div>

        </div>
      </div>

      {/* ── Support card ── */}
      <div className="purchase-support-card">
        <div className="purchase-support-row">
          <Phone aria-hidden="true" />
          <span>Gọi đặt mua: <strong>1900.1903</strong> (8:00 - 21:30)</span>
        </div>
        <div className="purchase-support-row">
          <MessageCircle aria-hidden="true" />
          <span>Chat ngay với nhân viên tư vấn</span>
        </div>
      </div>
      {selectedVoucherForModal ? <ProductVoucherModal vouchers={vouchers} initialVoucher={selectedVoucherForModal} onClose={() => setSelectedVoucherForModal(null)} /> : null}
      {isVoucherListModalOpen ? <ProductVoucherModal vouchers={vouchers} initialVoucher={null} onClose={() => setIsVoucherListModalOpen(false)} /> : null}
    </aside>
  );
}

export default function ProductSidebar({
  productData,
}: {
  productData: ProductDetailData;
}) {
  return (
    <>
      <ProductInformationColumn productData={productData} />
      <ProductPurchaseColumn productData={productData} />
    </>
  );
}
