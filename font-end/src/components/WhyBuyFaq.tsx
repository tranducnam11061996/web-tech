"use client";
import React, { useState } from "react";

function AccordionItem({
  num,
  title,
  children,
  defaultExpanded = false,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  return (
    <div className={`accordion-item ${isExpanded ? "active" : ""}`}>
      <div
        className="accordion-header cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="accordion-num">{num}</span>
        <span className="accordion-title">{title}</span>
        <span className="accordion-icon">
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            className={`transition-transform duration-300 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </div>
      <div
        className="accordion-body"
        style={{ display: isExpanded ? "block" : "none" }}
      >
        <div className="accordion-body-inner">{children}</div>
      </div>
    </div>
  );
}

export default function WhyBuyFaq() {
  const [activeTab, setActiveTab] = useState("whybuy");

  return (
    <section className="max-w-[1800px] mx-auto px-6 py-16" id="whybuy-faq">
      <div className="bg-[#111115] border border-[#1a1a1e] rounded-2xl p-8 md:p-12">
        {/*  Tabs  */}
        <div className="flex justify-center gap-2 mb-10">
          <button
            className={`tab-btn ${activeTab === "whybuy" ? "active" : ""}`}
            onClick={() => setActiveTab("whybuy")}
          >
            Why Buy
          </button>
          <button
            className={`tab-btn ${activeTab === "faq" ? "active" : ""}`}
            onClick={() => setActiveTab("faq")}
          >
            FAQ
          </button>
        </div>

        {/*  WHY BUY TAB  */}
        <div id="tab-whybuy" className={activeTab === "whybuy" ? "" : "hidden"}>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-4 leading-tight">
            Top 5 Reasons to Invest in a High-Performance Graphics Card (GPU)
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-[1200px]">
            Investing in a top-quality graphics card (GPU) significantly
            boosts your gaming performance, delivering higher frame rates and
            stunning visuals. It also accelerates demanding tasks such as
            video editing and 3D rendering, making your workflow more
            efficient. With the ability to support multiple monitors, a GPU
            creates an expansive workspace perfect for multitasking.
            Additionally, GPUs enhance overall system performance, ensuring
            your setup is ready for future software and gaming innovations.
          </p>

          <div className="space-y-2" id="whybuy-accordion">
            <AccordionItem
              num="01"
              title="Enhanced Gaming Performance:"
              defaultExpanded={true}
            >
              A high-performance GPU delivers higher frame rates and
              smoother gameplay, allowing you to enjoy the latest AAA
              titles at maximum settings. Whether you're into competitive
              esports or immersive open-world adventures, a powerful
              graphics card ensures a lag-free, visually stunning
              experience that keeps you ahead of the competition.
            </AccordionItem>
            <AccordionItem
              num="02"
              title="Efficient Video Editing and Rendering:"
              defaultExpanded={true}
            >
              Content creators and professionals benefit immensely from
              GPU acceleration. Tasks like 4K video editing, 3D modeling,
              and real-time rendering that would take hours on a CPU can
              be completed in minutes with a dedicated GPU, dramatically
              improving your productivity and creative workflow.
            </AccordionItem>
            <AccordionItem num="03" title="Machine Learning and AI Capabilities:">
              Modern GPUs are essential for machine learning, deep
              learning, and AI workloads. With thousands of CUDA cores and
              dedicated Tensor cores, GPUs can process massive datasets
              and train neural networks exponentially faster than CPUs,
              making them indispensable for data scientists and AI
              researchers.
            </AccordionItem>
            <AccordionItem num="04" title="Cryptocurrency Mining:">
              While the mining landscape has evolved, GPUs remain relevant
              for mining certain cryptocurrencies. Their parallel
              processing capabilities make them efficient at solving
              complex mathematical problems required for blockchain
              verification and proof-of-work algorithms.
            </AccordionItem>
            <AccordionItem num="05" title="Multi-Monitor and VR Support:">
              High-end GPUs support multiple display outputs, enabling
              expansive multi-monitor setups for productivity or gaming.
              They also power VR headsets with the high refresh rates and
              low latency needed for comfortable, immersive virtual
              reality experiences without motion sickness.
            </AccordionItem>
          </div>
        </div>

        {/*  FAQ TAB  */}
        <div id="tab-faq" className={activeTab === "faq" ? "" : "hidden"}>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-4 leading-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-[1200px]">
            Find answers to the most common questions about graphics cards,
            compatibility, warranty, and more. Can't find what you're looking
            for? Contact our support team for personalized assistance.
          </p>

          <div className="space-y-2" id="faq-accordion">
            <AccordionItem
              num="01"
              title="What graphics card is compatible with my PC?"
              defaultExpanded={true}
            >
              Compatibility depends on your motherboard's PCIe slot (most
              modern GPUs use PCIe x16), your power supply wattage, and
              your case dimensions. Check your PSU's wattage rating and
              available PCIe power connectors, and measure your case's GPU
              clearance before purchasing. Our AI PC Builder tool can help
              you find the perfect match.
            </AccordionItem>
            <AccordionItem
              num="02"
              title="How much VRAM do I need for gaming?"
              defaultExpanded={true}
            >
              For 1080p gaming, 6-8GB VRAM is sufficient for most titles.
              For 1440p, aim for 8-12GB. For 4K gaming, 12GB+ is
              recommended. Keep in mind that newer games are becoming more
              VRAM-hungry, so investing in more VRAM now can future-proof
              your setup for upcoming titles.
            </AccordionItem>
            <AccordionItem num="03" title="What is the warranty on your graphics cards?">
              All our graphics cards come with a minimum 3-year
              manufacturer warranty. Some premium models from brands like
              ASUS ROG and MSI Gaming offer extended warranties. We also
              provide our own Evetech support for the first 12 months for
              hassle-free returns and replacements.
            </AccordionItem>
            <AccordionItem num="04" title="NVIDIA vs AMD: Which should I choose?">
              Both offer excellent performance. NVIDIA excels in ray
              tracing (RTX), DLSS upscaling, and AI workloads with CUDA
              cores. AMD Radeon cards often provide better raw
              rasterization performance per dollar. For content creation
              and AI, NVIDIA is generally preferred. For pure gaming
              value, AMD can be a strong choice.
            </AccordionItem>
            <AccordionItem num="05" title="Do you offer delivery and installation services?">
              Yes! We offer nationwide delivery across South Africa with
              various shipping options including express next-day
              delivery. For customers in Gauteng, we also offer
              professional installation services where our technicians
              will install your new GPU and ensure everything is running
              optimally.
            </AccordionItem>
          </div>
        </div>
      </div>
    </section>
  );
}
