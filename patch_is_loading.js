const fs = require('fs');
let content = fs.readFileSync('D:/web-tech/font-end/src/app/category/page.tsx', 'utf8');

// Inject isLoading state
content = content.replace('const [showAllSubcategories, setShowAllSubcategories] = useState(false);', 'const [showAllSubcategories, setShowAllSubcategories] = useState(false);\n  const [isLoading, setIsLoading] = useState(true);');

// Update fetch to set isLoading
const fetchReplacement = `    setIsLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setProducts(res.data);
          if (res.pagination) {
            setTotalPages(res.pagination.totalPages);
            setTotalProducts(res.pagination.total);
          }
        }
      })
      .catch(err => console.error("Error fetching products:", err))
      .finally(() => setIsLoading(false));`;

content = content.replace(/fetch\(url\)[\s\S]*?\.catch\(err => console\.error\("Error fetching products:", err\)\);/, fetchReplacement);

// Replace grid UI
const gridReplacement = `      {isLoading ? (
        <div className="col-span-1 sm:col-span-2 xl:col-span-4 flex flex-col items-center justify-center py-32 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
          <p className="text-gray-400 text-sm font-medium animate-pulse">Đang tải sản phẩm...</p>
        </div>
      ) : products.length > 0 ? products.map((product: any) => (
        <a key={product.id} href={\`/\${product.slug}\`} className="product-card-category block relative overflow-hidden transition hover:-translate-y-1">
          <div className="product-img-category relative">
            <div className="gpu-box relative" style={{ background: "linear-gradient(135deg, #0f1a14 0%, #111115 50%, #141418 100%)", border: "1px solid #1a2e1f", height: "100%" }}>
              <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
                <ProgressiveImage src={product.thumbnail} alt={product.name} className="w-[85%] h-[85%] object-contain" />
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
                <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-0.5">✅ In Stock</span>
                <button className="text-gray-600 hover:text-white transition text-sm">🛒</button>
              </div>
            </div>
          </div>
        </a>
      )) : (
        <div className="col-span-1 sm:col-span-2 xl:col-span-4 flex flex-col items-center justify-center py-20 text-center bg-[#111115] rounded-2xl border border-[#1a1a1e] my-4">
          <div className="w-20 h-20 mb-5 rounded-full bg-[#1a1a1e] border border-[#27272a] flex items-center justify-center text-3xl">
            🔍
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Không tìm thấy sản phẩm phù hợp</h3>
          <p className="text-[13px] text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">
            Rất tiếc, không có sản phẩm nào khớp với bộ lọc bạn đang chọn. Hãy thử bỏ bớt một vài bộ lọc hoặc thay đổi tiêu chí tìm kiếm.
          </p>
          <button 
            className="bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white px-6 py-2 rounded-lg text-sm font-semibold transition-all"
            onClick={handleClearAll}
          >
            Bỏ tất cả bộ lọc
          </button>
        </div>
      )}`;

const regexGrid = /\{products\.length > 0 \? products\.map\(\(product: any\) => \([\s\S]*?\)\) : \([\s\S]*?<\/div>\r?\n      \)\}/;
content = content.replace(regexGrid, gridReplacement);

fs.writeFileSync('D:/web-tech/font-end/src/app/category/page.tsx', content);
