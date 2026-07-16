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
  PackageCheck,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addCartItem, clampQuantity } from "@/lib/cart";
import { sanitizeLegacyHtml } from "@/lib/sanitizeHtml";
import { normalizeProductSummaryLines } from "@/lib/productSummary";
import type { ProductDetailData, ProductVoucherSummary } from "@/types/product-detail";
import ProgressiveImage from "./ProgressiveImage";

const ProductVoucherModal = dynamic(() => import("./ProductVoucherModal"), { ssr: false });
const ProductComboBuilder = dynamic(() => import("./ProductComboBuilder"), { loading: () => <div className="h-28 animate-pulse rounded-xl bg-[#111115]" aria-hidden="true" /> });
const ProductGroupSelector = dynamic(() => import("./ProductGroupSelector"), { loading: () => <div className="h-20 animate-pulse rounded-xl bg-[#111115]" aria-hidden="true" /> });

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


const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value || 0)));

const PRODUCT_SUMMARY_PREVIEW_LIMIT = 5;

function ProductInformationColumn({ productData }: { productData: ProductDetailData }) {
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const price = Number(productData.price || 0);
  const marketPrice = Number(productData.marketPrice || 0);
  const savings = Math.max(0, Number(productData.savings || marketPrice - price || 0));
  const discountPercent = marketPrice > price && marketPrice > 0 ? Math.round((savings / marketPrice) * 100) : 0;
  const summaryLines = normalizeProductSummaryLines(productData.proSummary);
  const hasSummaryOverflow = summaryLines.length > PRODUCT_SUMMARY_PREVIEW_LIMIT;

  return (
    <section className="product-information-column" aria-labelledby="product-detail-title">
      <div className="product-detail-badges" aria-label="Nhãn sản phẩm">
        <span><CircleDollarSign aria-hidden="true" /> Trả góp 0%</span>
        <span><Flame aria-hidden="true" /> Bán chạy</span>
      </div>
      <h1 id="product-detail-title" className="product-detail-title">{productData.name}</h1>
      <div className="product-detail-meta">
        <a href="#sec-reviews" aria-label="Xem đánh giá sản phẩm"><strong>4.9</strong><span className="product-detail-stars" aria-hidden="true">★★★★★</span><span>(128 đánh giá)</span></a>
        {productData.brand ? <span>Thương hiệu: {productData.brandSlug ? <Link href={`/brand/${productData.brandSlug}`} className="font-semibold text-cyan-300 hover:text-cyan-200 hover:underline">{productData.brand}</Link> : productData.brand}</span> : null}
        {productData.sku ? <span>SKU: {productData.sku}</span> : null}
        {productData.views != null ? <span>Lượt xem: {productData.views}</span> : null}
      </div>
      {summaryLines.length > 0 ? <div className="product-summary" id="sec-specs">
        <ul id="product-summary-list">{summaryLines.map((line, index) => (
          <li
            key={`${line}-${index}`}
            hidden={hasSummaryOverflow && !isSummaryExpanded && index >= PRODUCT_SUMMARY_PREVIEW_LIMIT}
          >
            <Check aria-hidden="true" />
            <span dangerouslySetInnerHTML={{ __html: sanitizeLegacyHtml(line) }} />
          </li>
        ))}</ul>
        {hasSummaryOverflow ? <button
          type="button"
          className="product-inline-toggle"
          aria-expanded={isSummaryExpanded}
          aria-controls="product-summary-list"
          onClick={() => setIsSummaryExpanded((expanded) => !expanded)}
        >
          {isSummaryExpanded ? "Thu gọn thông số" : "Xem thêm thông số kỹ thuật"}
          <ChevronDown aria-hidden="true" />
        </button> : null}
      </div> : null}
      <div className="purchase-price-card block lg:hidden mb-4">
        <div className="purchase-price-heading"><span className="purchase-price-icon-wrapper"><Flame aria-hidden="true" /></span>Giá khuyến mãi :</div>
        <div className="purchase-price-body"><strong className="purchase-price-main">{formatNumber(price)}<sup className="purchase-price-dong">đ</sup></strong>{marketPrice > price ? <div className="purchase-price-savings"><span className="purchase-price-old">{formatNumber(marketPrice)}<sup>đ</sup></span><span className="purchase-price-discount">Tiết kiệm: {formatNumber(savings)}<sup>đ</sup> ({discountPercent}%)</span></div> : null}</div>
      </div>
      <ProductGroupSelector productGroup={productData.productGroup} />
      <ProductComboBuilder productData={productData} />
    </section>
  );
}

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
            const promotionHtml = promo.source === "product-editor" && promo.html
              ? sanitizeLegacyHtml(promo.html)
              : "";
            return (
            <div key={`${promo.source}:${promo.id}`} className="purchase-promo-item" data-promotion-source={promo.source}>
              <span className="purchase-promo-number" aria-hidden="true">{index + 1}</span>
              <div className="purchase-promo-text">
                {promotionHtml
                  ? <div className="purchase-promo-rich-text" dangerouslySetInnerHTML={{ __html: promotionHtml }} />
                  : <>
                      {promo.text}
                      {promo.detailUrl ? <>{" "}<a href={promo.detailUrl} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="purchase-promo-detail-link">
                        Xem chi tiết
                      </a></> : null}
                    </>}
              </div>
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
  return <><ProductInformationColumn key={productData.id} productData={productData} /><ProductPurchaseColumn productData={productData} /></>;
}
