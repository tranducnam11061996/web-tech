const fs = require('fs');
const c = fs.readFileSync('D:/web-tech/font-end/src/app/category/page.tsx', 'utf-8');
const lines = c.split('\n');

const mainEndIdx = lines.findIndex(l => l.includes('        </main>'));
if (mainEndIdx !== -1) {
  const goodLines = lines.slice(0, mainEndIdx + 1);
  const correctEOF = \
      </div>

      {/*  ==================== ss21.html ====================  */}
      <section className="max-w-[1800px] mx-auto px-6 py-16">
        <div className="bg-[#111115] border border-[#1a1a1e] rounded-2xl p-8 md:p-12">

          {/*  Tabs  */}
          <div className="flex justify-center gap-2 mb-10">
            <button className="tab-btn active" onClick={(e) => typeof window !== "undefined" && window.switchTab('whybuy', e.currentTarget)}>Why Buy</button>
            <button className="tab-btn" onClick={(e) => typeof window !== "undefined" && window.switchTab('faq', e.currentTarget)}>FAQ</button>
          </div>

          {/*  WHY BUY TAB  */}
          <div id="tab-whybuy">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-4 leading-tight">Top 5 Reasons to Invest in a High-Performance Graphics Card (GPU)</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-[1200px]">Investing in a top-quality graphics card (GPU) significantly boosts your gaming performance, delivering higher frame rates and stunning visuals. It also accelerates demanding tasks such as video editing and 3D rendering, making your workflow more efficient. With the ability to support multiple monitors, a GPU creates an expansive workspace perfect for multitasking. Additionally, GPUs enhance overall system performance, ensuring your setup is ready for future software and gaming innovations.</p>

            <div className="space-y-2" id="whybuy-accordion">
              <div className="accordion-item">
                <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
                  <span className="accordion-num">01</span>
                  <span className="accordion-title">Enhanced Gaming Performance:</span>
                  <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></span>
                </div>
                <div className="accordion-body"><div className="accordion-body-inner">A high-performance GPU delivers higher frame rates and smoother gameplay, allowing you to enjoy the latest AAA titles at maximum settings. Whether you're into competitive esports or immersive open-world adventures, a powerful graphics card ensures a lag-free, visually stunning experience that keeps you ahead of the competition.</div></div>
              </div>
              <div className="accordion-item">
                <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
                  <span className="accordion-num">02</span>
                  <span className="accordion-title">Efficient Video Editing and Rendering:</span>
                  <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></span>
                </div>
                <div className="accordion-body"><div className="accordion-body-inner">Content creators and professionals benefit immensely from GPU acceleration. Tasks like 4K video editing, 3D modeling, and real-time rendering that would take hours on a CPU can be completed in minutes with a dedicated GPU, dramatically improving your productivity and creative workflow.</div></div>
              </div>
              <div className="accordion-item">
                <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
                  <span className="accordion-num">03</span>
                  <span className="accordion-title">Machine Learning and AI Capabilities:</span>
                  <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></span>
                </div>
                <div className="accordion-body"><div className="accordion-body-inner">Modern GPUs are essential for machine learning, deep learning, and AI workloads. With thousands of CUDA cores and dedicated Tensor cores, GPUs can process massive datasets and train neural networks exponentially faster than CPUs, making them indispensable for data scientists and AI researchers.</div></div>
              </div>
              <div className="accordion-item">
                <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
                  <span className="accordion-num">04</span>
                  <span className="accordion-title">Cryptocurrency Mining:</span>
                  <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></span>
                </div>
                <div className="accordion-body"><div className="accordion-body-inner">While the mining landscape has evolved, GPUs remain relevant for mining certain cryptocurrencies. Their parallel processing capabilities make them efficient at solving complex mathematical problems required for blockchain verification and proof-of-work algorithms.</div></div>
              </div>
              <div className="accordion-item">
                <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
                  <span className="accordion-num">05</span>
                  <span className="accordion-title">Multi-Monitor and VR Support:</span>
                  <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></span>
                </div>
                <div className="accordion-body"><div className="accordion-body-inner">High-end GPUs support multiple display outputs, enabling expansive multi-monitor setups for productivity or gaming. They also power VR headsets with the high refresh rates and low latency needed for comfortable, immersive virtual reality experiences without motion sickness.</div></div>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed mt-8 max-w-[1200px]">Summary: Graphics cards deliver superior gaming performance, expedite video editing and rendering tasks, unlock machine learning and AI potential, facilitate cryptocurrency mining, and provide support for multi-monitor and VR setups. These vital features make them essential for gamers, content creators, industry professionals, and tech enthusiasts seeking optimal performance and cutting-edge functionality. ??</p>
          </div>

          {/*  FAQ TAB  */}
          <div id="tab-faq" className="hidden">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-4 leading-tight">Frequently Asked Questions</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-[1200px]">Find answers to the most common questions about graphics cards, compatibility, warranty, and more. Can't find what you're looking for? Contact our support team for personalized assistance.</p>

            <div className="space-y-2" id="faq-accordion">
              <div className="accordion-item">
                <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
                  <span className="accordion-num">01</span>
                  <span className="accordion-title">What graphics card is compatible with my PC?</span>
                  <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></span>
                </div>
                <div className="accordion-body"><div className="accordion-body-inner">Compatibility depends on your motherboard's PCIe slot (most modern GPUs use PCIe x16), your power supply wattage, and your case dimensions. Check your PSU's wattage rating and available PCIe power connectors, and measure your case's GPU clearance before purchasing. Our AI PC Builder tool can help you find the perfect match.</div></div>
              </div>
              <div className="accordion-item">
                <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
                  <span className="accordion-num">02</span>
                  <span className="accordion-title">How much VRAM do I need for gaming?</span>
                  <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></span>
                </div>
                <div className="accordion-body"><div className="accordion-body-inner">For 1080p gaming, 6-8GB VRAM is sufficient for most titles. For 1440p, aim for 8-12GB. For 4K gaming, 12GB+ is recommended. Keep in mind that newer games are becoming more VRAM-hungry, so investing in more VRAM now can future-proof your setup for upcoming titles.</div></div>
              </div>
              <div className="accordion-item">
                <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
                  <span className="accordion-num">03</span>
                  <span className="accordion-title">What is the warranty on your graphics cards?</span>
                  <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></span>
                </div>
                <div className="accordion-body"><div className="accordion-body-inner">All our graphics cards come with a minimum 3-year manufacturer warranty. Some premium models from brands like ASUS ROG and MSI Gaming offer extended warranties. We also provide our own Evetech support for the first 12 months for hassle-free returns and replacements.</div></div>
              </div>
              <div className="accordion-item">
                <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
                  <span className="accordion-num">04</span>
                  <span className="accordion-title">NVIDIA vs AMD: Which should I choose?</span>
                  <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></span>
                </div>
                <div className="accordion-body"><div className="accordion-body-inner">Both offer excellent performance. NVIDIA excels in ray tracing (RTX), DLSS upscaling, and AI workloads with CUDA cores. AMD Radeon cards often provide better raw rasterization performance per dollar. For content creation and AI, NVIDIA is generally preferred. For pure gaming value, AMD can be a strong choice.</div></div>
              </div>
              <div className="accordion-item">
                <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
                  <span className="accordion-num">05</span>
                  <span className="accordion-title">Do you offer delivery and installation services?</span>
                  <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></span>
                </div>
                <div className="accordion-body"><div className="accordion-body-inner">Yes! We offer nationwide delivery across South Africa with various shipping options including express next-day delivery. For customers in Gauteng, we also offer professional installation services where our technicians will install your new GPU and ensure everything is running optimally.</div></div>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed mt-8 max-w-[1200px]">Still have questions? Our dedicated support team is available via live chat, email, or phone to help you make the right choice. We're here to ensure you get the best graphics card for your needs and budget. ??</p>
          </div>

        </div>
      </section>

      {/*  ==================== ss22.html ====================  */}
      <section className="max-w-[1800px] mx-auto px-6 py-12">
        <div className="bg-[#111115] border border-[#1a1a1e] rounded-2xl p-6 md:p-8">

          {/*  Tabs  */}
          <div className="flex items-center gap-3 mb-8">
            <button className="rtab active" onClick={(e) => typeof window !== "undefined" && window.switchRTab('products', e.currentTarget)}>Similar Products <span className="badge">30</span></button>
            <button className="rtab" onClick={(e) => typeof window !== "undefined" && window.switchRTab('pages', e.currentTarget)}>Related Pages <span className="badge">14</span></button>
            <button className="rtab" onClick={(e) => typeof window !== "undefined" && window.switchRTab('posts', e.currentTarget)}>Related Posts <span className="badge">15</span></button>
          </div>

          {/*  SIMILAR PRODUCTS  */}
          <div id="rtab-products">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" id="products-grid"></div>
            <div className="flex justify-center mt-8">
              <button className="show-btn" id="products-btn" onClick={() => typeof window !== "undefined" && window.toggleShow('products')}>Show All (15)</button>
            </div>
          </div>

          {/*  RELATED PAGES  */}
          <div id="rtab-pages" className="hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" id="pages-grid"></div>
            <div className="flex justify-center mt-8">
              <button className="show-btn" id="pages-btn" onClick={() => typeof window !== "undefined" && window.toggleShow('pages')}>Show All (15)</button>
            </div>
          </div>

          {/*  RELATED POSTS  */}
          <div id="rtab-posts" className="hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" id="posts-grid"></div>
            <div className="flex justify-center mt-8">
              <button className="show-btn" id="posts-btn" onClick={() => typeof window !== "undefined" && window.toggleShow('posts')}>Show All (15)</button>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}

export default function CategoryPage(props: any) {
  const categoryId = props?.categoryId;
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white">Loading...</div>}>
      <CategoryContent categoryId={categoryId} {...props} />
    </Suspense>
  );
}
\;
  fs.writeFileSync('D:/web-tech/font-end/src/app/category/page.tsx', goodLines.join('\n') + correctEOF, 'utf-8');
} else {
  console.log('Could not find </main>');
}
