import { sanitizeLegacyHtml } from '@/lib/sanitizeHtml';
import { normalizeProductSummaryLines } from '@/lib/productSummary';
import ProductDescriptionDisclosure from './ProductDescriptionDisclosure';
import ProgressiveImage from './ProgressiveImage';

interface ProductDescriptionProps {
  productName: string;
  description?: string | null;
  thumbnail?: string | null;
  proSummary?: string | null;
}

export default function ProductDescription({ productName, description, thumbnail, proSummary }: ProductDescriptionProps) {
  const normalizedDescription = String(description || "").trim();
  const summaryLines = normalizeProductSummaryLines(proSummary);

  return (
    <div className="lg:w-[70%] scroll-mt-[15vh]" id="cot-motasanpham">
      <ProductDescriptionDisclosure>
        <div>
          <h2 className="text-lg font-bold text-white mb-6 border-b border-[#1a1a1e] pb-4">
            {normalizedDescription ? "Đánh giá: " : null}{productName}
          </h2>
          {normalizedDescription ? (
            <div
              data-product-static-html
              className="static-html-content text-gray-300 text-[15px] leading-relaxed [&>h1]:text-white [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:mt-6 [&>h2]:text-white [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-3 [&>h2]:mt-5 [&>h3]:text-white [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-3 [&>h3]:mt-4 [&>p]:mb-4 [&>img]:max-w-full [&>img]:rounded-lg [&>img]:my-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4"
              dangerouslySetInnerHTML={{ __html: sanitizeLegacyHtml(normalizedDescription) }}
            />
          ) : (
            <div className="static-html-content text-gray-300 text-[15px] leading-relaxed [&>h1]:text-white [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:mt-6 [&>h2]:text-white [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-3 [&>h2]:mt-5 [&>h3]:text-white [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-3 [&>h3]:mt-4 [&>p]:mb-4 [&>img]:max-w-full [&>img]:rounded-lg [&>img]:my-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4">
              <div className="product-description-fallback" data-testid="product-description-fallback">
                <ProgressiveImage
                  src={thumbnail || ""}
                  alt={productName}
                  fallbackText="Sản phẩm"
                  className="h-auto w-full object-contain object-center"
                  disableLoadingEffects
                />
                {summaryLines.length > 0 ? <ul className="product-description-fallback-summary" data-testid="product-description-fallback-summary">
                  {summaryLines.map((line, index) => (
                    <li key={`${line}-${index}`}>
                      <span dangerouslySetInnerHTML={{ __html: sanitizeLegacyHtml(line) }} />
                    </li>
                  ))}
                </ul> : null}
              </div>
            </div>
          )}
        </div>
      </ProductDescriptionDisclosure>
    </div>
  );
}
