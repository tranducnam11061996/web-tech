export default function Section5() {
  return (
    <>
  {/*  START section-5  */}
  <section className="section-5 featured-grid-category py-10 bg-dark-200" id="section-5">
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">

      {/*  Featured Categories Grid  */}
      <div className="featured-grid aspect-3-8">

        {/*  ============ COL 1 - ROW 1: LAPTOP DEALS ============  */}
        <div className="category-card card-laptop card-small">
          {/*  Text content  */}
          <div className="relative z-10">
            <h3 className="text-white font-extrabold text-xl md:text-2xl leading-tight tracking-tight uppercase">
              Laptop<br />Deals
            </h3>
          </div>
          {/*  CTA  */}
          <div className="relative z-10 mt-auto">
            <a href="#" className="cta-btn">
              Explore
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          {/*  Image placeholder  */}
          <div className="img-placeholder">
            <span className="text-white/10 text-xs text-center">Laptop<br />Image</span>
          </div>
        </div>

        {/*  ============ COL 2: PRE-BUILT PC'S (spans 2 rows) ============  */}
        <div className="category-card card-prebuilt card-center">
          {/*  Text content  */}
          <div className="relative z-10">
            <h3
              className="text-white font-extrabold text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight uppercase">
              Pre-Built<br />PC's
            </h3>
          </div>
          {/*  Image placeholder  */}
          <div className="img-placeholder">
            <span className="text-white/10 text-xs text-center">PC Case<br />Image</span>
          </div>
          {/*  CTA centered at bottom  */}
          <div className="relative z-10 mt-auto flex justify-center">
            <a href="#" className="cta-btn">
              Browse
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          {/*  Red dot indicator  */}
          <div className="dot-indicator"></div>
        </div>

        {/*  ============ COL 3 - ROW 1: GRAPHICS CARDS ============  */}
        <div className="category-card card-graphics card-small">
          {/*  Text content  */}
          <div className="relative z-10">
            <h3 className="text-white font-extrabold text-xl md:text-2xl leading-tight tracking-tight uppercase">
              Graphics<br />Cards
            </h3>
          </div>
          {/*  CTA  */}
          <div className="relative z-10 mt-auto">
            <a href="#" className="cta-btn">
              Shop Now
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          {/*  Image placeholder  */}
          <div className="img-placeholder">
            <span className="text-white/10 text-xs text-center">GPU<br />Image</span>
          </div>
        </div>

        {/*  ============ COL 1 - ROW 2: UPGRADE KITS ============  */}
        <div className="category-card card-upgrade card-small">
          {/*  Text content  */}
          <div className="relative z-10">
            <h3 className="text-white font-extrabold text-xl md:text-2xl leading-tight tracking-tight uppercase">
              Upgrade<br />Kits
            </h3>
          </div>
          {/*  CTA  */}
          <div className="relative z-10 mt-auto">
            <a href="#" className="cta-btn">
              Build
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          {/*  Image placeholder  */}
          <div className="img-placeholder">
            <span className="text-white/10 text-xs text-center">Kit<br />Image</span>
          </div>
        </div>

        {/*  COL 2 is already filled by the spanning card  */}

        {/*  ============ COL 3 - ROW 2: MONITOR DEALS ============  */}
        <div className="category-card card-monitor card-small">
          {/*  Text content  */}
          <div className="relative z-10">
            <h3 className="text-white font-extrabold text-xl md:text-2xl leading-tight tracking-tight uppercase">
              Monitor<br />Deals
            </h3>
          </div>
          {/*  CTA  */}
          <div className="relative z-10 mt-auto">
            <a href="#" className="cta-btn">
              View
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          {/*  Image placeholder  */}
          <div className="img-placeholder">
            <span className="text-white/10 text-xs text-center">Monitor<br />Image</span>
          </div>
        </div>

      </div>{/*  /featured-grid  */}

    </div>
  </section>
  {/*  END section-5  */}
    </>
  );
}
