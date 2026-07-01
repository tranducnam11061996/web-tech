export default function Section3() {
  return (
    <>
  {/*  START section-3  */}
  <section className="section-3 hero-section" id="section-3">
    <div className="hero-carousel" id="heroCarousel">
      <div className="hero-track" id="heroTrack">

        {/*  Slide 1: Apple Theme (Matching ss3.jpg)  */}
        <div className="hero-slide slide-1-bg">
          <div className="slide-content">
            <div className="slide-left">
              <h2 className="apple-title">
                {/*  Apple Logo SVG  */}
                <svg viewBox="0 0 384 512" width="32" height="32" fill="currentColor">
                  <path
                    d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </svg>
                Mac
              </h2>
              <h3 className="apple-gradient">Built for Apple Intelligence</h3>
              <p className="apple-desc">Supercharged for productivity</p>
              <button className="btn-buy">Buy now</button>
            </div>
            <div className="slide-right">
              {/*  Faux image representation based on the design  */}
              <div className="mac-mockup mac-left"></div>
              <div className="mac-mockup mac-right"></div>
              <div className="mac-mockup mac-center"></div>
              <div className="mac-mockup mac-mini"></div>
            </div>
          </div>
        </div>

        {/*  Slide 2: Gaming Theme Placeholder  */}
        <div className="hero-slide slide-2-bg">
          <div className="slide-content">
            <div className="slide-left text-white text-center w-full flex flex-col items-center">
              <h2 className="text-4xl font-bold mb-4">Next Gen Gaming</h2>
              <p className="text-xl text-gray-400 mb-8">Unleash the ultimate power with the new RTX 4090 Systems.</p>
              <button className="btn-buy">Shop PCs</button>
            </div>
          </div>
        </div>

        {/*  Slide 3: Peripherals Placeholder  */}
        <div className="hero-slide bg-gray-900">
          <div className="slide-content">
            <div className="slide-left text-white text-center w-full flex flex-col items-center">
              <h2 className="text-4xl font-bold mb-4 text-cyan-400">Upgrade Your Setup</h2>
              <p className="text-xl text-gray-400 mb-8">Premium keyboards, mice, and headsets.</p>
              <button className="btn-buy">Explore Accessories</button>
            </div>
          </div>
        </div>

      </div>

      {/*  Indicators  */}
      <div className="indicators-wrapper">
        <div className="indicators-pill" id="indicators">
          {/*  Creating 15 dashes as in the reference, but only 3 slides. Will map index.  */}
          <div className="indicator-dash active"></div>
          <div className="indicator-dash"></div>
          <div className="indicator-dash"></div>
          <div className="indicator-dash"></div>
          <div className="indicator-dash"></div>
          <div className="indicator-dash"></div>
          <div className="indicator-dash"></div>
          <div className="indicator-dash"></div>
          <div className="indicator-dash"></div>
          <div className="indicator-dash"></div>
          <div className="indicator-dash"></div>
          <div className="indicator-dash"></div>
          <div className="indicator-dash"></div>
          <div className="indicator-dash"></div>
          <div className="indicator-dash"></div>
        </div>
      </div>
    </div>
  </section>

  {/*  END section-3  */}
    </>
  );
}
