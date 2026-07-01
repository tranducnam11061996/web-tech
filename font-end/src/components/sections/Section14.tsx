export default function Section14() {
  return (
    <>
  {/*  START section-14  */}
  <section className="section-14 py-20 bg-dark" id="section-14">
    <div className="max-w-[1600px] mx-auto px-6">

      {/*  Grid container for 5 cards  */}

      <div className="grid grid-cols-6 lg:grid-cols-5 gap-4 md:gap-6">

        {/*  Card 1: Red  */}
        <div className="promo-card promo-card-r1 col-span-3 lg:col-span-1 card-color-red">
          <div className="card-bg-glow"></div>
          <div className="card-content">
            <h3 className="card-title">SSD<br />DEALS</h3>
            <div className="card-img-placeholder">
              <div className="faux-ssd-1"></div>
              <div className="faux-ssd-2"></div>
              <div className="faux-ssd-3"></div>
            </div>
          </div>
        </div>

        {/*  Card 2: Cyan  */}
        <div className="promo-card promo-card-r1 col-span-3 lg:col-span-1 card-color-cyan">
          <div className="card-bg-glow"></div>
          <div className="card-content">
            <h3 className="card-title">STREAMING<br />ESSENTIALS</h3>
            <div className="card-img-placeholder">
              <div className="faux-mic"></div>
              <div className="faux-cam"></div>
              <div className="faux-deck">
                <div className="faux-btn faux-btn-red"></div>
                <div className="faux-btn"></div>
                <div className="faux-btn faux-btn-blue"></div>
                <div className="faux-btn"></div>
                <div className="faux-btn faux-btn-green"></div>
                <div className="faux-btn"></div>
                <div className="faux-btn faux-btn-purple"></div>
                <div className="faux-btn"></div>
                <div className="faux-btn faux-btn-yellow"></div>
              </div>
            </div>
          </div>
        </div>

        {/*  Card 3: Orange  */}
        <div className="promo-card promo-card-r2 col-span-2 lg:col-span-1 card-color-orange">
          <div className="card-bg-glow"></div>
          <div className="card-content">
            <h3 className="card-title">TECH<br />ESSENTIALS</h3>
            <div className="card-img-placeholder">
              <div className="faux-power"></div>
              <div className="faux-watch"></div>
            </div>
          </div>
        </div>

        {/*  Card 4: Purple  */}
        <div className="promo-card promo-card-r2 col-span-2 lg:col-span-1 card-color-purple">
          <div className="card-bg-glow"></div>
          <div className="card-content">
            <h3 className="card-title">TRENDING<br />DEALS</h3>
            <div className="card-img-placeholder">
              <div className="faux-pc">
                <div className="faux-fan"></div>
                <div className="faux-fan"></div>
                <div className="faux-fan"></div>
              </div>
              <div className="faux-headset">
                <div className="faux-earcup faux-earcup--left"></div>
                <div className="faux-earcup faux-earcup--right"></div>
              </div>
            </div>
          </div>
        </div>

        {/*  Card 5: Green  */}
        <div className="promo-card promo-card-r2 col-span-2 lg:col-span-1 card-color-green">
          <div className="card-bg-glow"></div>
          <div className="card-content">
            <h3 className="card-title">APP ONLY<br />DEALS</h3>
            <div className="card-img-placeholder">
              <div className="faux-phone-1"></div>
              <div className="faux-phone-2"></div>
            </div>
          </div>
        </div>

      </div>

    </div>
  </section>
  {/*  END section-14  */}
    </>
  );
}
