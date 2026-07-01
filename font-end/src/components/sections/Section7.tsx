export default function Section7() {
  return (
    <>
  {/*  START section-7  */}
  <section className="section-7 py-10 bg-dark-200" id="section-7">
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">

      <div className="features-grid">

        {/*  ============================================  */}
        {/*  CARD 1: AI POWERED – NOT SURE WHICH LAPTOP?  */}
        {/*  ============================================  */}
        <div className="feature-card">
          {/*  Top badge  */}
          <div className="top-badge badge-ai">
            <span className="badge-dot"></span>
            AI Powered
          </div>

          {/*  Corner icon  */}
          <div className="corner-icon">✦</div>

          {/*  Heading  */}
          <h3 className="feature-heading">
            Not Sure Which<br />
            <span className="highlight-red">Laptop?</span>
          </h3>

          {/*  Description  */}
          <p className="feature-desc">
            Set your budget, pick your purpose, choose your specs, and our AI matches you with the perfect laptop in
            seconds.
          </p>

          {/*  CTA button  */}
          <div className="cta-outlined mb-20">
            ✦ Launch Finder →
          </div>

          {/*  Bottom stat pills  */}
          <div className="stat-row">
            <span className="stat-pill"><span className="stat-value stat-value-red">R8K+</span> Budget</span>
            <span className="stat-pill"><span className="stat-value stat-value-cyan">~40s</span> Speed</span>
            <span className="stat-pill"><span className="stat-value stat-value-green">200+</span> Models</span>
          </div>
        </div>

        {/*  ============================================  */}
        {/*  CARD 2: MOBILE APP – APP ONLY BEST DEALS     */}
        {/*  ============================================  */}
        <div className="feature-card">
          {/*  Top badge  */}
          <div className="top-badge badge-app">
            <span className="badge-dot"></span>
            Mobile App
          </div>

          {/*  Corner icon (phone)  */}
          <div className="corner-icon">📱</div>

          {/*  Heading  */}
          <h3 className="feature-heading">
            App Only<br />
            <span className="highlight-green">Best Deals</span>
          </h3>

          {/*  Description  */}
          <p className="feature-desc">
            Exclusive prices you won't find on desktop. Download the Evetech app and start saving.
          </p>

          {/*  Tag pills  */}
          <div className="tag-row">
            <span className="tag-pill"><span className="tag-accent tag-accent-green">FREE</span> Delivery</span>
            <span className="tag-pill"><span className="tag-accent tag-accent-yellow">DAILY</span> Flash Sales</span>
            <span className="tag-pill"><span className="tag-accent tag-accent-cyan">EXCLUSIVE</span> Prices</span>
          </div>

          {/*  App Store buttons  */}
          <div className="store-row">
            <a href="#" className="store-btn">
              <div className="store-icon">🍎</div>
              <div className="store-text">
                <span className="store-label">Download on the</span>
                <span className="store-name">App Store</span>
              </div>
            </a>
            <a href="#" className="store-btn">
              <div className="store-icon">▶</div>
              <div className="store-text">
                <span className="store-label">Get it on</span>
                <span className="store-name">Google Play</span>
              </div>
            </a>
          </div>
        </div>

        {/*  ============================================  */}
        {/*  CARD 3: AI BUILDER – DON'T GUESS BUILD SMART  */}
        {/*  ============================================  */}
        <div className="feature-card">
          {/*  Top badge  */}
          <div className="top-badge badge-builder">
            <span className="badge-dot"></span>
            AI Builder
          </div>

          {/*  Corner icon  */}
          <div className="corner-icon">⚙</div>

          {/*  Heading  */}
          <h3 className="feature-heading">
            Don't Guess.<br />
            <span className="highlight-yellow">Build Smart.</span>
          </h3>

          {/*  Description  */}
          <p className="feature-desc">
            You dream it. Our AI schemes it. Evetech builds the ultimate machine powerful, precise, and perfectly clean.
          </p>

          {/*  Bottom stat pills  */}
          <div className="tag-row">
            <span className="stat-pill"><span className="stat-value stat-value-green">50K+</span> Builds</span>
            <span className="stat-pill"><span className="stat-value stat-value-cyan">~60s</span> Speed</span>
            <span className="stat-pill"><span className="stat-value stat-value-yellow">#1</span> in SA</span>
          </div>

          {/*  CTA button  */}
          <div className="cta-outlined">
            Start Building →
          </div>
        </div>

        {/*  ============================================  */}
        {/*  CARD 4: FLASH DEALS – DON'T BLINK            */}
        {/*  ============================================  */}
        <div className="feature-card">
          {/*  Top badge  */}
          <div className="top-badge badge-flash">
            <span className="badge-dot"></span>
            Flash Deals
          </div>

          {/*  Corner icon (lightning)  */}
          <div className="corner-icon">⚡</div>

          {/*  Heading  */}
          <h3 className="feature-heading">
            Don't Blink.<br />
            <span className="highlight-pink">Deals Vanish.</span>
          </h3>

          {/*  Description  */}
          <p className="feature-desc">
            Limited-time prices, new drops daily — gone before you know it.
          </p>

          {/*  Tag pills  */}
          <div className="tag-row">
            <span className="stat-pill"><span className="stat-value stat-value-green">Up to 70%</span> Off</span>
            <span className="stat-pill"><span className="stat-value stat-value-yellow">24H</span> Only</span>
            <span className="stat-pill"><span className="stat-value stat-value-pink">Daily</span> Drops</span>
          </div>

          {/*  CTA button  */}
          <div className="cta-outlined">
            ✦ Shop Flash Deals →
          </div>
        </div>

      </div>{/*  /features-grid  */}

    </div>
  </section>
  {/*  END section-7  */}
    </>
  );
}
