import type { ProductGridCardData } from "./ProductGridCard";
import ProductGridCardStatic from "./ProductGridCardStatic";

export default function SimilarProducts({ products = [] }: { products?: ProductGridCardData[] }) {
  if (products.length === 0) return null;

  const initialProducts = products.slice(0, 5);
  const additionalProducts = products.slice(5, 15);

  return (
    <section className="mx-auto max-w-[1800px] px-4 py-6 md:px-6" aria-labelledby="similar-products-title">
      <div className="rounded-2xl border border-[#1a1a1e] bg-[#111115] p-4 md:p-6">
        <div className="mb-5">
          <h2 id="similar-products-title" className="text-xl font-bold text-white md:text-2xl">
            Sản phẩm tương tự
          </h2>
        </div>

        <div id="similar-products-grid" className="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {initialProducts.map((product) => <ProductGridCardStatic key={product.id} product={product} />)}
        </div>

        {additionalProducts.length > 0 ? (
          <details className="group mt-4 flex flex-col">
            <summary className="show-btn order-2 mx-auto mt-6 block w-fit cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
              <span className="group-open:hidden">{`Xem thêm (${additionalProducts.length})`}</span>
              <span className="hidden group-open:inline">Thu gọn</span>
            </summary>
            <div className="order-1 grid min-w-0 grid-cols-2 gap-4 pt-4 sm:grid-cols-3 lg:grid-cols-5">
              {additionalProducts.map((product) => <ProductGridCardStatic key={product.id} product={product} />)}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
