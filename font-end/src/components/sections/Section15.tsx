export default function Section15() {
  return (
    <>
  {/*  START section-15  */}
  <section className="section-15 py-10 bg-dark-200" id="section-15">
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">

      {/*  Brands Section  */}
      <div className="brands-section" id="brandsSection">

        {/*  Section Header  */}
        <div className="section-header">
          <h2 className="section-title">Brands We <span className="highlight">Supply</span></h2>
          <a href="#" className="view-all-btn">View All</a>
        </div>

        {/*  Brands Grid  */}
        <div className="brands-grid" id="brandsGrid">

          {/*  ROW 1  */}
          <div className="brand-card brand-tint-red">
            <span className="brand-name">ADATA</span>
          </div>
          <div className="brand-card">
            <span className="brand-name">ALIENWARE</span>
          </div>
          <div className="brand-card">
            <span className="brand-name brand-name-lg">AMD</span>
          </div>
          <div className="brand-card brand-tint-green">
            <span className="brand-name">Antec</span>
          </div>
          <div className="brand-card brand-tint-blue">
            <span className="brand-name brand-name-lg">AOC</span>
          </div>
          <div className="brand-card">
            <span className="brand-name brand-name-md">Apple<br /><span
                className="brand-name-sub">Authorized Reseller</span></span>
          </div>

          {/*  ROW 2  */}
          <div className="brand-card brand-tint-purple">
            <span className="brand-name">Arozzi</span>
          </div>
          <div className="brand-card">
            <span className="brand-name">ASRock</span>
          </div>
          <div className="brand-card">
            <span className="brand-name brand-name-lg">ASUS</span>
          </div>
          <div className="brand-card brand-tint-cyan">
            <span className="brand-name">AutoFull</span>
          </div>
          <div className="brand-card">
            <span className="brand-name brand-name-sm">Cooler Master<br /><span
                className="brand-name-sub">Make It Yours.</span></span>
          </div>
          <div className="brand-card">
            <span className="brand-name">CORSAIR</span>
          </div>

          {/*  ROW 3  */}
          <div className="brand-card">
            <span className="brand-name">cudy</span>
          </div>
          <div className="brand-card brand-tint-blue">
            <span className="brand-name">dahua</span>
          </div>
          <div className="brand-card">
            <span className="brand-name">DeepCool</span>
          </div>
          <div className="brand-card">
            <span className="brand-name brand-name-md">DELL Technologies</span>
          </div>
          <div className="brand-card">
            <span className="brand-name">EINAREX</span>
          </div>
          <div className="brand-card">
            <div className="badge-new">NEW</div>
            <span className="brand-name brand-name-lg">ELEGOO</span>
          </div>

          {/*  ROW 4  */}
          <div className="brand-card brand-tint-green">
            <span className="brand-name">enova</span>
          </div>
          <div className="brand-card">
            <span className="brand-name">Fractal</span>
          </div>
          <div className="brand-card">
            <span className="brand-name">GAMEMAX</span>
          </div>
          <div className="brand-card brand-tint-purple">
            <span className="brand-name">GAMDIAS</span>
          </div>
          <div className="brand-card">
            <span className="brand-name">GLORIOUS</span>
          </div>
          <div className="brand-card">
            <span className="brand-name">Govee</span>
          </div>

          {/*  ROW 5 (hidden by default)  */}
          <div className="brand-card extra-row">
            <span className="brand-name">HyperX</span>
          </div>
          <div className="brand-card extra-row brand-tint-red">
            <span className="brand-name">Intel</span>
          </div>
          <div className="brand-card extra-row">
            <span className="brand-name">Kingston</span>
          </div>
          <div className="brand-card extra-row brand-tint-cyan">
            <span className="brand-name">Lenovo</span>
          </div>
          <div className="brand-card extra-row">
            <span className="brand-name">LG</span>
          </div>
          <div className="brand-card extra-row">
            <span className="brand-name">Logitech</span>
          </div>

          {/*  ROW 6 (hidden by default)  */}
          <div className="brand-card extra-row brand-tint-blue">
            <span className="brand-name">MARVO</span>
          </div>
          <div className="brand-card extra-row">
            <span className="brand-name">MSI</span>
          </div>
          <div className="brand-card extra-row brand-tint-green">
            <span className="brand-name">NZXT</span>
          </div>
          <div className="brand-card extra-row">
            <span className="brand-name">NVIDIA</span>
          </div>
          <div className="brand-card extra-row brand-tint-purple">
            <span className="brand-name">Razer</span>
          </div>
          <div className="brand-card extra-row">
            <span className="brand-name">Samsung</span>
          </div>

          {/*  ROW 7 (hidden by default)  */}
          <div className="brand-card extra-row">
            <span className="brand-name">SteelSeries</span>
          </div>
          <div className="brand-card extra-row brand-tint-red">
            <span className="brand-name">Thermaltake</span>
          </div>
          <div className="brand-card extra-row">
            <span className="brand-name">TP-Link</span>
          </div>
          <div className="brand-card extra-row brand-tint-cyan">
            <span className="brand-name">Turtle Beach</span>
          </div>
          <div className="brand-card extra-row">
            <span className="brand-name">ViewSonic</span>
          </div>
          <div className="brand-card extra-row">
            <span className="brand-name">Western Digital</span>
          </div>

        </div>{/*  /brands-grid  */}

        {/*  Expand overlay with gradient fade  */}
        <div className="expand-overlay" id="expandOverlay">
          <button className="expand-btn" id="expandBtn" aria-label="Show more brands">
            ▼
          </button>
        </div>

      </div>{/*  /brands-section  */}

    </div>
  </section>

  {/*  END section-15  */}
    </>
  );
}
