export default function Section8() {
  return (
    <>
  {/*  START section-8  */}
  <section className="section-8 py-10 bg-dark-200" id="section-8">
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">

      {/*  Trending Products Section  */}
      <div className="trending-section">

        {/*  Section Header  */}
        <div className="section-header">
          <h2 className="section-title">Trending Products</h2>
          <div className="header-actions">
            <button className="nav-arrow" id="prevBtn" aria-label="Previous">←</button>
            <a href="#" className="view-all-btn">View All</a>
          </div>
        </div>

        {/*  Carousel  */}
        <div className="carousel-wrapper" id="carouselContainer">
          <div className="carousel-track" id="carouselTrack">

            {/*  Product 1: HP 15-fc0003ni  */}
            <div className="product-card">
              <div className="product-img">
                <div className="spec-badges">
                  <span className="spec-badge spec-cpu">4.3 GHz Ryzen 5</span>
                  <span className="spec-badge spec-ram">8GB RAM</span>
                  <span className="spec-badge spec-ssd">512GB SSD</span>
                </div>
                <div className="placeholder-box">
                  <span className="ph-text">HP Laptop<br />Image</span>
                </div>
              </div>
              <div className="tag-row">
                <span className="tag-pill tag-trending">Trending</span>
                <span className="tag-pill tag-special">Special</span>
              </div>
              <div className="product-info">
                <span className="product-name">HP 15-fc0003ni 8GB/512GB...</span>
                <div className="product-footer">
                  <span className="product-price">R 8,999</span>
                  <div className="product-menu"><span>⋮</span></div>
                </div>
              </div>
            </div>

            {/*  Product 2: Lenovo IdeaPad Slim 3  */}
            <div className="product-card">
              <div className="product-img">
                <div className="spec-badges">
                  <span className="spec-badge spec-cpu">4.60 GHz Core i5</span>
                  <span className="spec-badge spec-ram">8GB RAM</span>
                  <span className="spec-badge spec-ssd">512GB SSD</span>
                </div>
                <div className="placeholder-box">
                  <span className="ph-text">Lenovo IdeaPad<br />Image</span>
                </div>
              </div>
              <div className="tag-row">
                <span className="tag-pill tag-trending">Trending</span>
                <span className="tag-pill tag-winter">Winter Special</span>
              </div>
              <div className="product-info">
                <span className="product-name">Lenovo IdeaPad Slim 3...</span>
                <div className="product-footer">
                  <span className="product-price">R 9,999</span>
                  <div className="product-menu"><span>⋮</span></div>
                </div>
              </div>
            </div>

            {/*  Product 3: Lenovo LOQ 16GB/1TB Core i7  */}
            <div className="product-card">
              <div className="product-img">
                <div className="spec-badges">
                  <span className="spec-badge spec-cpu">5.30GHz Core i7</span>
                  <span className="spec-badge spec-ram">16GB RAM</span>
                  <span className="spec-badge spec-ssd">1TB SSD</span>
                </div>
                <div className="gpu-badge">RTX 5050 8GB</div>
                <div className="placeholder-box">
                  <span className="ph-text">Lenovo LOQ<br />Image</span>
                </div>
              </div>
              <div className="tag-row">
                <span className="tag-pill tag-trending">Trending</span>
                <span className="tag-pill tag-winter">Winter Special</span>
              </div>
              <div className="product-info">
                <span className="product-name">Lenovo LOQ 16GB/1TB Core i7</span>
                <div className="product-footer">
                  <span className="product-price">R 20,999</span>
                  <div className="product-menu"><span>⋮</span></div>
                </div>
              </div>
            </div>

            {/*  Product 4: Lenovo LOQ 32GB/1TB Core i7  */}
            <div className="product-card">
              <div className="product-img">
                <div className="spec-badges">
                  <span className="spec-badge spec-cpu">5.30GHz Core i7</span>
                  <span className="spec-badge spec-ram">32GB RAM</span>
                  <span className="spec-badge spec-ssd">1TB SSD</span>
                </div>
                <div className="gpu-badge">RTX 5060 8GB</div>
                <div className="placeholder-box">
                  <span className="ph-text">Lenovo LOQ<br />32GB Image</span>
                </div>
              </div>
              <div className="tag-row">
                <span className="tag-pill tag-trending">Trending</span>
                <span className="tag-pill tag-special">Special</span>
              </div>
              <div className="product-info">
                <span className="product-name">Lenovo LOQ 32GB/1TB Core i7</span>
                <div className="product-footer">
                  <span className="product-price">R 24,999</span>
                  <div className="product-menu"><span>⋮</span></div>
                </div>
              </div>
            </div>

            {/*  Product 5: Logitech G502 Hero  */}
            <div className="product-card">
              <div className="product-img">
                <div className="placeholder-box">
                  <span className="ph-text">Logitech G502<br />Mouse Image</span>
                </div>
              </div>
              <div className="tag-row">
                <span className="tag-pill tag-trending">Trending</span>
              </div>
              <div className="product-info">
                <span className="product-name">Logitech G502 Hero RGB...</span>
                <div className="product-footer">
                  <span className="product-price">R 729</span>
                  <div className="product-menu"><span>⋮</span></div>
                </div>
              </div>
            </div>

            {/*  Product 6: Gamdias KRATOS E1-600  */}
            <div className="product-card">
              <div className="product-img">
                <div className="placeholder-box">
                  <span className="ph-text">Gamdias KRATOS<br />PSU Image</span>
                </div>
              </div>
              <div className="tag-row">
                <span className="tag-pill tag-trending">Trending</span>
              </div>
              <div className="product-info">
                <span className="product-name">Gamdias KRATOS E1-600 RGB...</span>
                <div className="product-footer">
                  <span className="product-price">R 949</span>
                  <div className="product-menu"><span>⋮</span></div>
                </div>
              </div>
            </div>

            {/*  Product 7: MSI A520M  */}
            <div className="product-card">
              <div className="product-img">
                <div className="placeholder-box">
                  <span className="ph-text">MSI A520M<br />Motherboard Image</span>
                </div>
              </div>
              <div className="tag-row">
                <span className="tag-pill tag-trending">Trending</span>
              </div>
              <div className="product-info">
                <span className="product-name">MSI A520M-A...</span>
                <div className="product-footer">
                  <span className="product-price">R 1,249</span>
                  <div className="product-menu"><span>⋮</span></div>
                </div>
              </div>
            </div>

            {/*  Product 8: ASUS ROG Strix  */}
            <div className="product-card">
              <div className="product-img">
                <div className="spec-badges">
                  <span className="spec-badge spec-cpu">5.80GHz Core i9</span>
                  <span className="spec-badge spec-ram">32GB RAM</span>
                  <span className="spec-badge spec-ssd">2TB SSD</span>
                </div>
                <div className="gpu-badge">RTX 5080 16GB</div>
                <div className="placeholder-box">
                  <span className="ph-text">ASUS ROG<br />Laptop Image</span>
                </div>
              </div>
              <div className="tag-row">
                <span className="tag-pill tag-trending">Trending</span>
                <span className="tag-pill tag-special">Special</span>
              </div>
              <div className="product-info">
                <span className="product-name">ASUS ROG Strix G16 32GB...</span>
                <div className="product-footer">
                  <span className="product-price">R 49,999</span>
                  <div className="product-menu"><span>⋮</span></div>
                </div>
              </div>
            </div>

            {/*  Product 9: Corsair Vengeance  */}
            <div className="product-card">
              <div className="product-img">
                <div className="placeholder-box">
                  <span className="ph-text">Corsair RAM<br />Image</span>
                </div>
              </div>
              <div className="tag-row">
                <span className="tag-pill tag-trending">Trending</span>
              </div>
              <div className="product-info">
                <span className="product-name">Corsair Vengeance DDR5 32GB...</span>
                <div className="product-footer">
                  <span className="product-price">R 1,899</span>
                  <div className="product-menu"><span>⋮</span></div>
                </div>
              </div>
            </div>

            {/*  Product 10: Samsung 990 EVO  */}
            <div className="product-card">
              <div className="product-img">
                <div className="placeholder-box">
                  <span className="ph-text">Samsung SSD<br />Image</span>
                </div>
              </div>
              <div className="tag-row">
                <span className="tag-pill tag-trending">Trending</span>
                <span className="tag-pill tag-special">Special</span>
              </div>
              <div className="product-info">
                <span className="product-name">Samsung 990 EVO Plus 2TB...</span>
                <div className="product-footer">
                  <span className="product-price">R 2,499</span>
                  <div className="product-menu"><span>⋮</span></div>
                </div>
              </div>
            </div>

          </div>{/*  /carousel-track  */}
        </div>{/*  /carousel-wrapper  */}

      </div>{/*  /trending-section  */}

    </div>
  </section>

  {/*  END section-8  */}
    </>
  );
}
