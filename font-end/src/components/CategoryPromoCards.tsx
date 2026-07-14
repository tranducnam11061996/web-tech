export default function CategoryPromoCards() {
  return (
    <>
      {/*  Promo Box 1: AI Laptop Finder  */}
      <div
        className="promo-box"
        style={{
          background:
            "linear-gradient(135deg, #0c1a12 0%, #111115 50%, #1a0f10 100%)",
          borderColor: "#1a2e1f",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="bg-red-500/20 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
            {"\u26A1 AI-Powered"}
          </span>
          <span className="text-xl">{"\u{1F916}"}</span>
        </div>
        <h3 className="text-[22px] font-extrabold leading-tight mb-1">
          Your perfect
        </h3>
        <h3 className="text-[22px] font-extrabold leading-tight mb-1">
          <span className="text-emerald-400">laptop match</span> awaits
        </h3>
        <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
          Tell our AI what you need. Budget, purpose, done. Matched in
          seconds.
        </p>
        <div className="flex gap-2 mb-5">
          <span className="bg-[#1a1a1e] text-[10px] text-gray-400 px-3 py-1.5 rounded-full flex items-center gap-1">
            {"\u{1F3AE} Gaming"}
          </span>
          <span className="bg-[#1a1a1e] text-[10px] text-gray-400 px-3 py-1.5 rounded-full flex items-center gap-1">
            {"\u{1F4BC} Work"}
          </span>
          <span className="bg-[#1a1a1e] text-[10px] text-gray-400 px-3 py-1.5 rounded-full flex items-center gap-1">
            {"\u{1F4DA} Study"}
          </span>
        </div>
        <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2">
          {"\u2726 Launch Finder \u2192"}
        </button>
      </div>

      {/*  Promo Box 2: Build Smart  */}
      <div
        className="promo-box"
        style={{
          background: "linear-gradient(135deg, #111115 0%, #0f1117 100%)",
          borderColor: "#1a1a2e",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xl font-extrabold leading-tight">
              Don't guess.
            </h3>
            <h3 className="text-xl font-extrabold leading-tight">
              <span className="text-cyan-400">Build smart.</span>
            </h3>
          </div>
          <span className="text-xl">{"\u{1F44D}"}</span>
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
          Your budget & games in {"\u2192"} perfectly optimized build out. No tech
          knowledge needed.
        </p>
        <div className="flex gap-2 mb-5">
          <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
            50K+
          </span>
          <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
            ~60s
          </span>
          <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
            #1
          </span>
        </div>
        <button className="w-full bg-[#1a1a1e] hover:bg-[#27272a] text-white text-sm font-bold py-2.5 rounded-xl transition border border-[#27272a]">
          Start Building {"\u2192"}
        </button>
      </div>

      {/*  Promo Box 3: App Only Deals  */}
      <div
        className="promo-box"
        style={{
          background: "linear-gradient(135deg, #0f1117 0%, #111115 100%)",
          borderColor: "#1a1a2e",
        }}
      >
        <span className="bg-blue-500/20 text-blue-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 w-fit mb-3">
          {"\u{1F4F1} Mobile App"}
        </span>
        <h3 className="text-xl font-extrabold leading-tight mb-0.5">
          Unlock
        </h3>
        <h3 className="text-xl font-extrabold leading-tight mb-2">
          <span className="text-blue-400">App Only</span> Deals
        </h3>
        <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
          Prices you won't find on desktop. Download and save.
        </p>
        <div className="flex gap-3">
          <button className="flex-1 bg-[#1a1a1e] hover:bg-[#27272a] text-white text-[11px] font-bold py-2 rounded-lg transition border border-[#27272a] flex items-center justify-center gap-1.5">
            {" "}
            App Store
          </button>
          <button className="flex-1 bg-[#1a1a1e] hover:bg-[#27272a] text-white text-[11px] font-bold py-2 rounded-lg transition border border-[#27272a] flex items-center justify-center gap-1.5">
            {"\u25B6 Google Play"}
          </button>
        </div>
      </div>

      {/*  Promo Box 4: Know More  */}
      <div
        className="promo-box"
        style={{ background: "#111115", borderColor: "#1a1a1e" }}
      >
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-xl font-extrabold leading-tight">
              Know more.
            </h3>
            <h3 className="text-xl font-extrabold leading-tight">
              <span className="text-purple-400">Game better.</span>
            </h3>
          </div>
          <span className="text-gray-600 text-sm">OG</span>
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
          Reviews, guides & benchmarks from the Evetech team. Read before
          you buy.
        </p>
        <div className="flex gap-2 mb-5">
          <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
            100+
          </span>
          <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
            50+
          </span>
          <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
            REAL
          </span>
        </div>
        <button className="w-full bg-[#1a1a1e] hover:bg-[#27272a] text-white text-sm font-bold py-2.5 rounded-xl transition border border-[#27272a]">
          Explore Evezone {"\u2192"}
        </button>
      </div>
    </>
  );
}
