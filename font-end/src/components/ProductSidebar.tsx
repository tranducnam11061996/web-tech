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
  Truck,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { addCartItem, clampQuantity } from "@/lib/cart";
import { sanitizeLegacyHtml } from "@/lib/sanitizeHtml";
import type { ProductDetailData } from "@/types/product-detail";
import ProgressiveImage from "./ProgressiveImage";
import ProductBundleModal, { BundleProduct } from "./ProductBundleModal";

const COLOR_VARIANTS = [
  { id: "gold-pink", name: "Vàng Hồng - Dây hồng", price: "9.190.000đ", image: "https://placehold.co/40x40/ffffff/333333?text=VH" },
  { id: "silver-purple", name: "Bạc - Dây tím", price: "9.190.000đ", image: "https://placehold.co/40x40/ffffff/333333?text=B" },
  { id: "black-black", name: "Đen bóng - Dây đen", price: "9.190.000đ", image: "https://placehold.co/40x40/ffffff/333333?text=D" },
  { id: "gray-black", name: "Xám không gian - Dây đen", price: "9.190.000đ", image: "https://placehold.co/40x40/ffffff/333333?text=X" },
];

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

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value || 0)));

function ProductInformationColumn({
  productData,
}: {
  productData: ProductDetailData;
}) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(COLOR_VARIANTS[0].id);
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([
    BUNDLE_ITEMS[0].id,
  ]);
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

      <div className="product-variant-block">
        <p className="product-variant-title">Màu sắc</p>
        <div className="product-variant-list">
          {COLOR_VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`product-variant-btn ${selectedVariant === v.id ? "is-active" : ""}`}
              onClick={() => setSelectedVariant(v.id)}
            >
              <div className="product-variant-img">
                <img src={v.image} alt={v.name} />
              </div>
              <div className="product-variant-info">
                <span className="product-variant-name">{v.name}</span>
                <span className="product-variant-price">{v.price}</span>
              </div>
              {selectedVariant === v.id && (
                <div className="product-variant-tick">
                  <Check size={12} strokeWidth={4} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

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
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Promotions data (matches HACOM reference design)                  */
/* ------------------------------------------------------------------ */

const PROMOTIONS = [
  {
    id: 1,
    text: "Trả góp 0% lãi suất, tối đa 12 tháng, trả trước từ 10% qua CTTC hoặc 0đ qua thẻ tín dụng",
  },
  {
    id: 2,
    text: "Giảm đến 1 triệu khi thanh toán qua thẻ tín dụng HSBC",
  },
  {
    id: 3,
    text: "Tặng voucher mua RAM LAPTOP và Chuột/Bàn phím/Webcam Logitech MX series hoặc PRO X series giảm thêm 20% qua app CellphoneS",
  },
  {
    id: 4,
    text: "Nâng cấp Laptop - PC lên Windows 11 Pro chỉ với 1,190,000đ (DV.PM.41/DV.PM.42)",
  },
  {
    id: 5,
    text: "Giảm 5% tối đa 1 TRIỆU, tặng Balo CPS trị giá 600K và Quà tặng đặc quyền cho thành viên S-Student, S-teacher",
  },
];

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
  const VOUCHERS = [
    {
      id: "v1",
      discountLabel: "Giảm",
      discountValue: "4%",
      title: "Voucher laptop 4%",
      desc: "Tối đa 800k, áp dụng toàn bộ Laptop (trừ...",
      expiry: "31/07/2026",
      rules: [
        "Giảm 5% tối đa 1 Triệu - dành cho các sản phẩm có hiển thị voucher.",
        "Mỗi SĐT lấy mã 1 lần trong suốt thời gian diễn ra chương trình.",
        "Chỉ áp dụng cho đơn hàng online",
        "Hạn sử dụng voucher: 3 ngày",
        "Lưu ý:",
        "- Không áp dụng cùng các CTKM khác",
        "- Không đi kèm quà tặng khác",
        "- Không áp dụng cùng ưu đãi hạng thành viên, thu cũ đổi mới.",
        "- Không áp dụng cùng ưu đãi và quà tặng học sinh - sinh viên."
      ]
    },
    {
      id: "v2",
      discountLabel: "Giảm",
      discountValue: "4%",
      title: "Voucher laptop 4%",
      desc: "Tối đa 2 triệu, áp dụng cho tất cả Laptop mã...",
      expiry: "31/07/2026",
      rules: [
        "Giảm 5% tối đa 1 Triệu - dành cho các sản phẩm có hiển thị voucher.",
        "Mỗi SĐT lấy mã 1 lần trong suốt thời gian diễn ra chương trình.",
        "Chỉ áp dụng cho đơn hàng online",
        "Hạn sử dụng voucher: 3 ngày",
        "Lưu ý:",
        "- Không áp dụng cùng các CTKM khác",
        "- Không đi kèm quà tặng khác",
        "- Không áp dụng cùng ưu đãi hạng thành viên, thu cũ đổi mới.",
        "- Không áp dụng cùng ưu đãi và quà tặng học sinh - sinh viên."
      ]
    },
    {
      id: "v3",
      discountLabel: "Giảm",
      discountValue: "4%",
      title: "Voucher laptop 4%",
      desc: "Tối đa 800k, áp dụng toàn bộ Laptop (trừ...",
      expiry: "31/07/2026",
      rules: [
        "Giảm 5% tối đa 1 Triệu - dành cho các sản phẩm có hiển thị voucher.",
        "Mỗi SĐT lấy mã 1 lần trong suốt thời gian diễn ra chương trình.",
        "Chỉ áp dụng cho đơn hàng online",
        "Hạn sử dụng voucher: 3 ngày",
        "Lưu ý:",
        "- Không áp dụng cùng các CTKM khác",
        "- Không đi kèm quà tặng khác",
        "- Không áp dụng cùng ưu đãi hạng thành viên, thu cũ đổi mới.",
        "- Không áp dụng cùng ưu đãi và quà tặng học sinh - sinh viên."
      ]
    },
    {
      id: "v4",
      discountLabel: "Giảm",
      discountValue: "4%",
      title: "Voucher laptop 4%",
      desc: "Tối đa 2 triệu, áp dụng cho tất cả Laptop mã...",
      expiry: "31/07/2026",
      rules: [
        "Giảm 5% tối đa 1 Triệu - dành cho các sản phẩm có hiển thị voucher.",
        "Mỗi SĐT lấy mã 1 lần trong suốt thời gian diễn ra chương trình.",
        "Chỉ áp dụng cho đơn hàng online",
        "Hạn sử dụng voucher: 3 ngày",
        "Lưu ý:",
        "- Không áp dụng cùng các CTKM khác",
        "- Không đi kèm quà tặng khác",
        "- Không áp dụng cùng ưu đãi hạng thành viên, thu cũ đổi mới.",
        "- Không áp dụng cùng ưu đãi và quà tặng học sinh - sinh viên."
      ]
    },
  ];
  const [selectedVoucherForModal, setSelectedVoucherForModal] = useState<typeof VOUCHERS[0] | null>(null);
  const vouchersPerSlide = 2;
  const totalVoucherSlides = Math.ceil(VOUCHERS.length / vouchersPerSlide);

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

      {/* ── Voucher / Promotions card ── */}
      <div className="purchase-promo-card">
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
          {voucherSlideIndex > 0 && (
            <button
              type="button"
              className="product-bundle-slider-arrow is-left"
              onClick={() => setVoucherSlideIndex((prev) => prev - 1)}
              aria-label="Previous voucher slide"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
          )}

          <div className="product-bundle-slider-viewport" style={{ overflow: "hidden" }}>
            <div
              className="product-bundle-slider-track"
              style={{ transform: `translateX(-${voucherSlideIndex * 100}%)` }}
            >
              {Array.from({ length: totalVoucherSlides }).map((_, slideIdx) => {
                const slideVouchers = VOUCHERS.slice(
                  slideIdx * vouchersPerSlide,
                  (slideIdx + 1) * vouchersPerSlide
                );
                return (
                  <div key={slideIdx} className="product-bundle-slide">
                    <div className="purchase-voucher-row">
                      {slideVouchers.map((voucher) => (
                        <div 
                          key={voucher.id} 
                          className="purchase-voucher-ticket"
                          onClick={() => setSelectedVoucherForModal(voucher)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="purchase-voucher-badge">
                            <span className="purchase-voucher-badge-label">{voucher.discountLabel}</span>
                            <span className="purchase-voucher-badge-value">{voucher.discountValue}</span>
                          </div>
                          <div className="purchase-voucher-content">
                            <div className="purchase-voucher-info">
                              <strong>{voucher.title}</strong>
                              <span>{voucher.desc}</span>
                              <span className="purchase-voucher-expiry">
                                <span className="purchase-voucher-expiry-label">Thời hạn:</span>
                                <span className="purchase-voucher-expiry-time"> {voucher.expiry}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {voucherSlideIndex < totalVoucherSlides - 1 && (
            <button
              type="button"
              className="product-bundle-slider-arrow is-right"
              onClick={() => setVoucherSlideIndex((prev) => prev + 1)}
              aria-label="Next voucher slide"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Numbered promotions list */}
        <div className="purchase-numbered-promos">
          {PROMOTIONS.map((promo) => (
            <div key={promo.id} className="purchase-promo-item">
              <span className="purchase-promo-number">{promo.id}</span>
              <span className="purchase-promo-text">
                {promo.text}{" "}
                <button type="button" className="purchase-promo-detail-link">
                  Xem chi tiết
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

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
      {/* Voucher Modal */}
      {selectedVoucherForModal && (
        <div className="voucher-modal-overlay" style={{ zIndex: 1001 }} onClick={() => setSelectedVoucherForModal(null)}>
          <div className="voucher-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="voucher-modal-header">
              <h3 className="voucher-modal-title">Thể lệ chương trình</h3>
              <button 
                type="button" 
                className="voucher-modal-close" 
                onClick={() => setSelectedVoucherForModal(null)}
                aria-label="Đóng"
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="voucher-modal-body">
              {selectedVoucherForModal.rules.map((rule, index) => (
                <p 
                  key={index} 
                  className={rule === "Lưu ý:" ? "voucher-modal-rule-heading" : "voucher-modal-rule-text"}
                >
                  {rule}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Voucher List Modal */}
      {isVoucherListModalOpen && (
        <div className="voucher-modal-overlay" onClick={() => setIsVoucherListModalOpen(false)}>
          <div className="voucher-modal-content voucher-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="voucher-modal-header voucher-list-header">
              <h3 className="voucher-modal-title">Ưu đãi & voucher</h3>
              <button 
                type="button" 
                className="voucher-modal-close" 
                onClick={() => setIsVoucherListModalOpen(false)}
                aria-label="Đóng"
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="voucher-list-body">
              {VOUCHERS.map((voucher) => (
                <div key={voucher.id} className="border border-l-0 border-red-500 rounded-md bg-[#fffafa] overflow-hidden grid grid-cols-[80px_1fr] min-h-[145px]">
                  <div className="flex flex-col items-center justify-center bg-[#e30019] text-white border-r border-dashed border-red-500/50" style={{ backgroundImage: 'radial-gradient(circle at 0px 50%, #ffffff 4px, transparent 4.5px)', backgroundSize: '10px 14px', backgroundRepeat: 'repeat-y', backgroundPosition: 'left center' }}>
                    <span className="text-[15px] font-extrabold leading-tight">{voucher.discountLabel}</span>
                    <span className="text-[20px] font-black leading-tight">{voucher.discountValue}</span>
                  </div>
                  <div className="flex-1 flex flex-col p-3 pb-4 gap-2 justify-between">
                    <div className="flex flex-col gap-1 w-full">
                      <strong className="text-gray-900 text-[16px]">{voucher.title}</strong>
                      <span className="text-gray-600 text-[13px] leading-snug">Tối đa 2 triệu, áp dụng cho tất cả laptop mới (trừ MacBook)</span>
                      <span className="text-gray-500 text-[11px]">Thời hạn thu thập: <strong className="text-gray-900">22:30 {voucher.expiry}</strong></span>
                    </div>
                    <div className="flex w-full justify-end mt-1">
                      <button 
                        type="button" 
                        className="bg-[#e30019] hover:bg-[#b91c1c] text-white rounded px-3 py-1.5 text-[13px] font-bold"
                        onClick={() => setSelectedVoucherForModal(voucher)}
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="voucher-list-footer">
              <button 
                type="button" 
                className="voucher-list-btn-close"
                onClick={() => setIsVoucherListModalOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
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
