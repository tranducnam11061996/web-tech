"use client";
import React, { useState } from "react";

export default function SimilarProducts() {
  const [activeTab, setActiveTab] = useState("products");
  const [showAllProducts, setShowAllProducts] = useState(false);

  return (
    <section className="max-w-[1800px] mx-auto px-6 py-12" id="similar-products">
      <div className="bg-[#111115] border border-[#1a1a1e] rounded-2xl p-6 md:p-8">
        {/*  Tabs  */}
        <div className="flex items-center gap-3 mb-8">
          <button
            className={`rtab ${activeTab === "products" ? "active" : ""}`}
            onClick={() => setActiveTab("products")}
          >
            Similar Products <span className="badge">30</span>
          </button>
          <button
            className={`rtab ${activeTab === "pages" ? "active" : ""}`}
            onClick={() => setActiveTab("pages")}
          >
            Related Pages <span className="badge">14</span>
          </button>
          <button
            className={`rtab ${activeTab === "posts" ? "active" : ""}`}
            onClick={() => setActiveTab("posts")}
          >
            Related Posts <span className="badge">15</span>
          </button>
        </div>

        {/*  SIMILAR PRODUCTS  */}
        <div id="rtab-products" className={activeTab === "products" ? "" : "hidden"}>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
            id="products-grid"
          >
            {/* Grid items would be mapped here */}
          </div>
          <div className="flex justify-center mt-8">
            <button
              className="show-btn"
              id="products-btn"
              onClick={() => setShowAllProducts(!showAllProducts)}
            >
              {showAllProducts ? "Thu gọn" : "Show All (15)"}
            </button>
          </div>
        </div>
        
        {/* Empty tabs for completeness */}
        <div id="rtab-pages" className={activeTab === "pages" ? "" : "hidden"}>
          <div className="text-gray-500 text-center py-10">No related pages found.</div>
        </div>
        <div id="rtab-posts" className={activeTab === "posts" ? "" : "hidden"}>
          <div className="text-gray-500 text-center py-10">No related posts found.</div>
        </div>
      </div>
    </section>
  );
}
