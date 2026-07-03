const fs = require('fs');
let content = fs.readFileSync('D:/web-tech/font-end/src/app/category/page.tsx', 'utf8');

// Inject price bounds state
content = content.replace('const [attributes, setAttributes] = useState<any[]>([]);', 'const [attributes, setAttributes] = useState<any[]>([]);\n  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 200000000 });\n  const [currentPrice, setCurrentPrice] = useState({ min: 0, max: 200000000 });');

// Add fetch for price bounds
const boundsFetch = `      fetch(\`http://localhost:3000/api/categories/price-bounds?categoryId=\${activeCatId}\`)
        .then(res => res.json())
        .then(res => {
          if (res.success) {
            setPriceBounds(res.data);
          }
        })
        .catch(err => console.error("Error fetching price bounds:", err));`;

content = content.replace('fetch(`http://localhost:3000/api/categories/attributes?categoryId=${activeCatId}`)', boundsFetch + '\n\n      fetch(`http://localhost:3000/api/categories/attributes?categoryId=${activeCatId}`)');

// Sync currentPrice with URL or bounds
const priceSyncLogic = `
  useEffect(() => {
    const minParam = searchParamsHook?.get('min-price');
    const maxParam = searchParamsHook?.get('max-price');
    setCurrentPrice({
      min: minParam ? parseInt(minParam, 10) : priceBounds.min,
      max: maxParam ? parseInt(maxParam, 10) : priceBounds.max
    });
  }, [searchParamsHook, priceBounds]);

  const handlePriceChange = (e: any, type: 'min' | 'max') => {
    const val = parseInt(e.target.value, 10);
    setCurrentPrice(prev => {
      let newMin = prev.min;
      let newMax = prev.max;
      if (type === 'min') newMin = Math.min(val, prev.max - 1000);
      else newMax = Math.max(val, prev.min + 1000);
      return { min: newMin, max: newMax };
    });
  };

  const handlePriceCommit = () => {
    const newParams = new URLSearchParams(searchParamsHook?.toString() || '');
    if (currentPrice.min > priceBounds.min) newParams.set('min-price', currentPrice.min.toString());
    else newParams.delete('min-price');
    if (currentPrice.max < priceBounds.max) newParams.set('max-price', currentPrice.max.toString());
    else newParams.delete('max-price');
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    router.push(currentPath + '?' + newParams.toString(), { scroll: false });
  };
`;

content = content.replace('// Clear all filters handler', priceSyncLogic + '\n  // Clear all filters handler');

const priceUiRegex = /<div className="filter-section open" id="price-range-sidebar">[\s\S]*?<\/div>\r?\n      <\/div>/;

const priceUiReplacement = `<div className="filter-section open" id="price-range-sidebar">
        <div className="filter-title" onClick={(e) => typeof window !== "undefined" && window.toggleFilter(e.currentTarget)}>
          <span className="flex items-center gap-2"><span className="text-sm">💰</span> Price Range</span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div className="filter-content px-1 mt-2">
          <div className="dual-range-container">
            <div className="dual-range-track" id="price-track" style={{ left: \`\${((currentPrice.min - priceBounds.min) / (priceBounds.max - priceBounds.min || 1)) * 100}%\`, right: \`\${100 - ((currentPrice.max - priceBounds.min) / (priceBounds.max - priceBounds.min || 1)) * 100}%\` }}></div>
            <input type="range" id="price-min" className="dual-range-slider" min={priceBounds.min} max={priceBounds.max} value={currentPrice.min} step={1000} onChange={(e) => handlePriceChange(e, 'min')} onMouseUp={handlePriceCommit} onTouchEnd={handlePriceCommit} />
            <input type="range" id="price-max" className="dual-range-slider" min={priceBounds.min} max={priceBounds.max} value={currentPrice.max} step={1000} onChange={(e) => handlePriceChange(e, 'max')} onMouseUp={handlePriceCommit} onTouchEnd={handlePriceCommit} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-4">
            <span id="price-val-min">đ {new Intl.NumberFormat("vi-VN").format(currentPrice.min)}</span>
            <span id="price-val-max">đ {new Intl.NumberFormat("vi-VN").format(currentPrice.max)}</span>
          </div>
        </div>
      </div>`;

content = content.replace(priceUiRegex, priceUiReplacement);

fs.writeFileSync('D:/web-tech/font-end/src/app/category/page.tsx', content);
