export default function Section10() {
  return (
    <>
  {/*  START section-10  */}
  <section className="section-10 py-10 bg-dark-200" id="section-10">
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">

      {/*  Gift Section Container  */}
      <div className="gift-section">

        {/*  Main layout: CTA left + Carousel right  */}
        <div className="gift-layout flex-stretch">

          {/*  Left CTA Panel  */}
          <div className="cta-panel">
            <h2 className="cta-title">
              Find The<br />
              <span className="highlight">Perfect</span><br />
              Gift
            </h2>
            <button className="cta-button">Show Now</button>

            {/*  Star decorations  */}
            <div className="star-deco star-deco--right-40"></div>
          </div>

          {/*  Right: Product Carousel  */}
          <div className="carousel-wrapper" id="carouselContainer">
            <div className="carousel-track" id="carouselTrack">

              {/*  Product 1: Logitech G502 Hero  */}
              <div className="product-card">
                <div className="product-img">
                  <span className="placeholder-text">Logitech G502<br />Hero Image</span>
                </div>
                <div className="product-info">
                  <span className="product-brand">Logitech</span>
                  <span className="product-name">Logitech G502 Hero RGB Gaming...</span>
                  <div className="product-footer">
                    <span className="product-price">R 729</span>
                    <div className="product-menu"><span>⋮</span></div>
                  </div>
                </div>
              </div>

              {/*  Product 2: Logitech M171  */}
              <div className="product-card">
                <div className="product-img">
                  <span className="placeholder-text">Logitech M171<br />Mouse Image</span>
                </div>
                <div className="product-info">
                  <span className="product-brand">Logitech</span>
                  <span className="product-name">Logitech M171 Wireless Mouse Grey</span>
                  <div className="product-footer">
                    <span className="product-price">R 169</span>
                    <div className="product-menu"><span>⋮</span></div>
                  </div>
                </div>
              </div>

              {/*  Product 3: Evetech Zen Mousepad  */}
              <div className="product-card">
                <div className="product-img">
                  <div className="badge-last">Last Edition</div>
                  <span className="placeholder-text">Evetech Zen<br />Mousepad Image</span>
                </div>
                <div className="product-info">
                  <span className="product-brand">Evetech</span>
                  <span className="product-name">Evetech Zen Gaming Mousepad X...</span>
                  <div className="product-footer">
                    <span className="product-price">R 299</span>
                    <div className="product-menu"><span>⋮</span></div>
                  </div>
                </div>
              </div>

              {/*  Product 4: Gamdias NYX-P3  */}
              <div className="product-card">
                <div className="product-img">
                  <span className="placeholder-text">Gamdias NYX-P3<br />Mousepad Image</span>
                </div>
                <div className="product-info">
                  <span className="product-brand">Gamdias</span>
                  <span className="product-name">Gamdias NYX-P3 Extra-Elongated...</span>
                  <div className="product-footer">
                    <span className="product-price">R 299</span>
                    <div className="product-menu"><span>⋮</span></div>
                  </div>
                </div>
              </div>

              {/*  Product 5: MARVO  */}
              <div className="product-card">
                <div className="product-img">
                  <span className="placeholder-text">MARVO<br />Product Image</span>
                </div>
                <div className="product-info">
                  <span className="product-brand">MARVO</span>
                  <span className="product-name">MARVO Gaming Mouse Pad RGB...</span>
                  <div className="product-footer">
                    <span className="product-price">R 399</span>
                    <div className="product-menu"><span>⋮</span></div>
                  </div>
                </div>
              </div>

              {/*  Product 6: Razer DeathAdder  */}
              <div className="product-card">
                <div className="product-img">
                  <span className="placeholder-text">Razer DeathAdder<br />Mouse Image</span>
                </div>
                <div className="product-info">
                  <span className="product-brand">Razer</span>
                  <span className="product-name">Razer DeathAdder Essential Gaming...</span>
                  <div className="product-footer">
                    <span className="product-price">R 549</span>
                    <div className="product-menu"><span>⋮</span></div>
                  </div>
                </div>
              </div>

              {/*  Product 7: SteelSeries Rival  */}
              <div className="product-card">
                <div className="product-img">
                  <span className="placeholder-text">SteelSeries<br />Mouse Image</span>
                </div>
                <div className="product-info">
                  <span className="product-brand">SteelSeries</span>
                  <span className="product-name">SteelSeries Rival 3 Gaming Mouse...</span>
                  <div className="product-footer">
                    <span className="product-price">R 699</span>
                    <div className="product-menu"><span>⋮</span></div>
                  </div>
                </div>
              </div>

              {/*  Product 8: HyperX Pulsefire  */}
              <div className="product-card">
                <div className="product-img">
                  <span className="placeholder-text">HyperX<br />Mouse Image</span>
                </div>
                <div className="product-info">
                  <span className="product-brand">HyperX</span>
                  <span className="product-name">HyperX Pulsefire Haste 2 Wireless...</span>
                  <div className="product-footer">
                    <span className="product-price">R 1,299</span>
                    <div className="product-menu"><span>⋮</span></div>
                  </div>
                </div>
              </div>

            </div>{/*  /carousel-track  */}
          </div>{/*  /carousel-wrapper  */}

        </div>{/*  /gift-layout  */}

      </div>{/*  /gift-section  */}

    </div>
  </section>

  {/*  END section-10  */}
    </>
  );
}
