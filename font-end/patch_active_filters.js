const fs = require('fs');
let content = fs.readFileSync('D:/web-tech/font-end/src/app/category/page.tsx', 'utf8');

if (!content.includes('const router = useRouter();') && content.includes('export default function CategoryPage')) {
  content = content.replace('const searchParamsHook = useSearchParams();', 'const searchParamsHook = useSearchParams();\n  const router = useRouter();');
}

const activeFiltersLogic = `
  const activeFilters: any[] = [];
  if (searchParamsHook && attributes.length > 0) {
    searchParamsHook.forEach((value, key) => {
      if (!['id', 'page', 'limit', 'category_id'].includes(key)) {
        const attr = attributes.find(a => (a.filter_code || slugify(a.name)) === key);
        if (attr) {
          const vals = value.split(',');
          vals.forEach(valSlug => {
            const valObj = attr.values.find((v: any) => slugify(v.name) === valSlug);
            if (valObj) {
              activeFilters.push({
                key,
                attrName: attr.name,
                valSlug,
                valName: valObj.name
              });
            }
          });
        }
      }
    });
  }

  // Clear all filters handler
  const handleClearAll = () => {
    const newParams = new URLSearchParams(searchParamsHook?.toString() || '');
    activeFilters.forEach(f => newParams.delete(f.key));
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    router.push(currentPath + '?' + newParams.toString(), { scroll: false });
  };

  // Remove single filter
  const handleRemoveFilter = (f: any) => {
    const newParams = new URLSearchParams(searchParamsHook?.toString() || '');
    let vals = newParams.get(f.key)?.split(',') || [];
    vals = vals.filter(v => v !== f.valSlug);
    if (vals.length > 0) newParams.set(f.key, vals.join(','));
    else newParams.delete(f.key);
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    router.push(currentPath + '?' + newParams.toString(), { scroll: false });
  };
`;

if (!content.includes('const activeFilters')) {
  content = content.replace('useEffect(() => {', activeFiltersLogic + '\n  useEffect(() => {');
}

const activeFiltersHtml = `<div id="active-filters-sidebar" style={activeFilters.length === 0 ? { display: 'none' } : {}}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-400 font-semibold">Active Filters</span>
          <span id="active-filters-count" className="bg-[#1a1a1e] text-[10px] text-gray-500 px-1.5 py-0.5 rounded font-bold">{activeFilters.length}</span>
          <span id="clear-all-filters" className="text-[10px] text-cyan-500 ml-auto cursor-pointer hover:underline" onClick={handleClearAll}>Clear all</span>
        </div>
        <div id="active-filters-list" className="flex gap-2 mb-4 flex-wrap mt-2">
          {activeFilters.map((f, i) => (
            <span key={i} className="bg-cyan-900/30 text-cyan-400 border border-cyan-800/50 text-[11px] px-2 py-1 rounded flex items-center gap-1 cursor-pointer hover:bg-cyan-900/50 transition-colors" onClick={() => handleRemoveFilter(f)}>
              {f.valName} <span className="text-cyan-500 hover:text-white">✕</span>
            </span>
          ))}
        </div>
      </div>`;

const htmlRegex = /<div id="active-filters-sidebar">[\s\S]*?<\/div>\r?\n      <\/div>/;
content = content.replace(htmlRegex, activeFiltersHtml);

fs.writeFileSync('D:/web-tech/font-end/src/app/category/page.tsx', content);
