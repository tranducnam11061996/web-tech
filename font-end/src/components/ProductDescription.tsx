import { sanitizeLegacyHtml } from '@/lib/sanitizeHtml';

interface ProductDescriptionProps {
  productName: string;
  description: string;
}

export default function ProductDescription({ productName, description }: ProductDescriptionProps) {
  if (!description) return null;

  return (
    <div className="lg:w-[70%] scroll-mt-[15vh]" id="cot-motasanpham">
      <details className="product-description-disclosure py-6">
        <summary className="product-description-toggle">
          <span className="product-description-more">Xem thêm</span>
          <span className="product-description-less">Thu gọn</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="product-description-content relative">
          <h2 className="text-lg font-bold text-white mb-6 border-b border-[#1a1a1e] pb-4">Đánh giá: {productName}</h2>
          <div
            className="static-html-content text-gray-300 text-[15px] leading-relaxed [&>h1]:text-white [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:mt-6 [&>h2]:text-white [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-3 [&>h2]:mt-5 [&>h3]:text-white [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-3 [&>h3]:mt-4 [&>p]:mb-4 [&>img]:max-w-full [&>img]:rounded-lg [&>img]:my-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4"
            dangerouslySetInnerHTML={{ __html: sanitizeLegacyHtml(description) }}
          />
        </div>
      </details>
    </div>
  );
}
