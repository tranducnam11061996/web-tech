import React, { useState } from "react";
import { X, Star, Search, ChevronRight, ChevronLeft, ChevronDown } from "lucide-react";

export type BundleProduct = {
  id: string;
  brand: string;
  badge: string;
  image: string;
  specs: { icon: string; text: string }[];
  title: string;
  price: string;
  originalPrice: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tabs: string[];
  products: BundleProduct[];
};

export default function ProductBundleModal({ isOpen, onClose, tabs, products }: Props) {
  const [activeTab, setActiveTab] = useState(tabs[0] || "Nổi bật");
  
  if (!isOpen) return null;

  return (
    <div className="bundle-list-overlay" onClick={onClose}>
      <div className="bundle-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bundle-list-header">
          <h3 className="font-semibold">Mua Kèm - Giá Sốc</h3>
          <button type="button" className="bundle-list-close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="bundle-list-tabs-container">
          <div className="bundle-list-tabs">
            <button 
              className={`bundle-list-tab ${activeTab === "Nổi bật" ? "is-active" : ""}`}
              onClick={() => setActiveTab("Nổi bật")}
            >
              <Star size={14} fill={activeTab === "Nổi bật" ? "currentColor" : "none"} />
              Nổi bật
            </button>
            {tabs.map((tab) => (
              <button 
                key={tab}
                className={`bundle-list-tab ${activeTab === tab ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <button className="bundle-list-tab-arrow is-left"><ChevronLeft size={16} /></button>
          <button className="bundle-list-tab-arrow is-right"><ChevronRight size={16} /></button>
          <div className="bundle-list-tab-track"></div>
        </div>

        <div className="bundle-list-grid">
          {products.map((p) => (
            <div key={p.id} className="bundle-grid-item">
              <div className="bundle-grid-item-top">
                <div className="bundle-grid-badge">{p.badge}</div>
                <div className="bundle-grid-brand">{p.brand}</div>
                <div className="bundle-grid-image">
                  <img src={p.image} alt={p.title} />
                </div>
                <div className="bundle-grid-specs">
                  {p.specs.map((spec, i) => (
                    <div key={i} className="bundle-grid-spec">
                      <img src={spec.icon} alt="" />
                      <span>{spec.text}</span>
                    </div>
                  ))}
                  <div className="bundle-grid-colors">
                    <span className="color-dot" style={{background: "#e5e7eb"}}></span>
                    <span className="color-dot" style={{background: "#374151"}}></span>
                    <span className="color-dot" style={{background: "#000000"}}></span>
                  </div>
                </div>
              </div>
              <div className="bundle-grid-item-info">
                <h4 className="bundle-grid-title">{p.title}</h4>
                <div className="bundle-grid-price-row">
                  <span className="bundle-grid-price">{p.price}</span>
                  <span className="bundle-grid-original">{p.originalPrice}</span>
                </div>
              </div>
              <div className="bundle-grid-item-bottom">
                <a href="#" className="bundle-grid-link">Xem chi tiết</a>
                <button type="button" className="bundle-grid-btn">Chọn</button>
              </div>
            </div>
          ))}
        </div>

        <div className="bundle-list-footer">
        </div>
      </div>
    </div>
  );
}
