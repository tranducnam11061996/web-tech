import type { BuyingGuideData } from "../types/buying-guide";

function AccordionItem({
  num,
  title,
  answer,
  defaultExpanded = false,
}: {
  num: string;
  title: string;
  answer: string;
  defaultExpanded?: boolean;
}) {
  return (
    <details className="accordion-item group" open={defaultExpanded}>
      <summary
        className="accordion-header w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
      >
        <span className="accordion-num" aria-hidden="true">{num}</span>
        <span className="accordion-title">{title}</span>
        <span className="accordion-icon" aria-hidden="true">
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            className="transition-transform duration-300 motion-reduce:transition-none group-open:rotate-180"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </summary>
      <div className="accordion-body">
        <div className="accordion-body-inner whitespace-pre-line border-t border-[#1a1a1e] pt-3 text-[15px] leading-7 text-zinc-400">
          {answer}
        </div>
      </div>
    </details>
  );
}

export default function WhyBuyFaq({ buyingGuide }: { buyingGuide?: BuyingGuideData | null }) {
  const items = Array.isArray(buyingGuide?.items)
    ? buyingGuide.items.filter((item) => item?.question?.trim() && item?.answer?.trim())
    : [];

  if (!buyingGuide?.heading?.trim() || items.length === 0) return null;

  return (
    <section className="max-w-[1800px] mx-auto px-6 py-16" id="whybuy-faq">
      <div className="bg-[#111115] border border-[#1a1a1e] rounded-2xl p-8 md:p-12">
        <h2 className="text-2xl md:text-3xl font-extrabold mb-4 leading-tight text-balance">
          {buyingGuide.heading}
        </h2>
        {buyingGuide.introduction?.trim() ? (
          <p className="max-w-[1200px] whitespace-pre-line text-sm leading-relaxed text-gray-500 mb-8">
            {buyingGuide.introduction}
          </p>
        ) : null}

        <div className="space-y-2" id="whybuy-accordion">
          {items.map((item, index) => (
            <AccordionItem
              key={item.id}
              num={String(index + 1).padStart(2, "0")}
              title={item.question}
              answer={item.answer}
              defaultExpanded={item.defaultExpanded}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
