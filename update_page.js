const fs = require("fs");
const path = "D:/web-tech/font-end/src/app/category/page.tsx";
let content = fs.readFileSync(path, "utf8");

// Add imports
if (!content.includes("import { useEffect, useState }")) {
  content = content.replace(`import Header from "../../components/Header";`, `import { useEffect, useState } from "react";\nimport Header from "../../components/Header";`);
}

// Add state and fetch
if (!content.includes("const [products, setProducts] = useState")) {
  const replacement = `export default function CategoryPage() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    let url = "http://localhost:3000/api/products?limit=12";
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const catId = searchParams.get("id");
      if (catId) {
        url += "&category_id=" + catId;
      }
    }
    fetch(url)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setProducts(res.data);
        }
      })
      .catch(err => console.error("Error fetching products:", err));
  }, []);
`;
  content = content.replace(`export default function CategoryPage() {`, replacement);
}

// Replace grid content
const startIdx = content.indexOf(`<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" id="productGrid">`);
const endIdx = content.indexOf(`</main>`);

if (startIdx !== -1 && endIdx !== -1) {
  const gridReplacement = `<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" id="productGrid">
      {products.length > 0 ? products.map((product: any) => (
        <a key={product.id} href={\`/\${product.slug}\`} className="product-card-category block relative overflow-hidden transition hover:-translate-y-1">
          <div className="product-img-category relative">
            <div className="gpu-box relative" style={{ background: "linear-gradient(135deg, #0f1a14 0%, #111115 50%, #141418 100%)", border: "1px solid #1a2e1f", height: "100%" }}>
              <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
                <img src={product.thumbnail} alt={product.name} className="w-[85%] h-[85%] object-contain" />
              </div>
            </div>
          </div>
          <div className="p-4 relative z-20">
            <p className="text-[10px] text-gray-500 font-semibold text-center mb-1">HACOM</p>
            <p className="text-[12px] text-gray-300 font-medium text-center leading-tight mb-3 line-clamp-2 h-[32px]">{product.name}</p>
            <div className="flex items-center justify-between">
              <span className="text-white font-extrabold text-[15px]">
                {new Intl.NumberFormat("vi-VN").format(product.price)}<sup className="text-[10px] underline decoration-[1px] underline-offset-2 ml-1 relative -top-1">d</sup>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-0.5">? In Stock</span>
                <button className="text-gray-600 hover:text-white transition text-sm">?</button>
              </div>
            </div>
          </div>
        </a>
      )) : (
        <div className="col-span-4 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      )}
    </div>
  `;
  content = content.substring(0, startIdx) + gridReplacement + "\n  " + content.substring(endIdx);
}

fs.writeFileSync(path, content);
console.log("Updated successfully");

