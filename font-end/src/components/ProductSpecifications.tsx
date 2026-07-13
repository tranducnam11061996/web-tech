import { sanitizeLegacyHtml } from '@/lib/sanitizeHtml';
import ProductSpecificationsOpenButton from './ProductSpecificationsOpenButton';

interface ProductSpecificationsProps {
  productName: string;
  specs: string;
  hasSpecifications: boolean;
}

export default function ProductSpecifications({ productName, specs, hasSpecifications }: ProductSpecificationsProps) {
  if (!hasSpecifications || !specs) return null;
  const safeSpecs = sanitizeLegacyHtml(specs);

  return (
    <>
      <div className="lg:w-[30%]" id="cot-thongsokythuat">
        <div className="lg:sticky lg:top-6">
          <div id="specCol" className="pt-6 relative" style={{ maxHeight: '66vh', overflow: 'hidden' }}>
            <div className="pb-4 border-b border-[#1a1a1e]">
              <h3 className="font-bold text-lg text-white">Thông số kỹ thuật</h3>
            </div>
            <div className="px-2 product-spec-list" dangerouslySetInnerHTML={{ __html: safeSpecs }} />
            <div className="absolute bottom-0 left-0 right-0 h-[150px] bg-gradient-to-t from-[#111115] via-[#111115]/80 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
              <ProductSpecificationsOpenButton />
            </div>
          </div>
        </div>
      </div>

      <dialog id="specModal" className="modal-backdrop" aria-labelledby="product-specifications-modal-title">
        <div className="modal-content flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#1a1a1e] bg-[#111115] rounded-t-2xl">
            <h3 id="product-specifications-modal-title" className="font-bold text-base text-white">Thông số kỹ thuật</h3>
            <form method="dialog">
              <button type="submit" aria-label="Đóng thông số kỹ thuật" className="w-8 h-8 rounded-full bg-[#1a1a1e] hover:bg-red-500/20 hover:text-red-500 text-gray-400 flex items-center justify-center transition">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </form>
          </div>
          <div className="flex items-center gap-3 p-5 border-b border-[#1a1a1e]">
            <div className="w-12 h-12 bg-[#0d0d10] border border-[#1a1a1e] rounded-lg flex items-center justify-center shrink-0" aria-hidden="true">🖥️</div>
            <p className="text-sm font-medium text-white">{productName}</p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-5 pt-3">
            <div className="product-spec-list" dangerouslySetInnerHTML={{ __html: safeSpecs }} />
          </div>
        </div>
      </dialog>
    </>
  );
}
