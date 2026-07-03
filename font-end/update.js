const fs = require('fs');
let content = fs.readFileSync('D:/web-tech/font-end/src/app/category/page.tsx', 'utf8');

// 1. Add state
const stateTarget = 'const [totalProducts, setTotalProducts] = useState(0);';
if (!content.includes('setSubcategories')) {
  content = content.replace(stateTarget, stateTarget + '\n  const [subcategories, setSubcategories] = useState<any[]>([]);');
}

// 2. Add activeCatId logic
const fetchTarget = `let url = \`http://localhost:3000/api/products?limit=24&page=\${currentPage}\`;
    if (categoryId) {
      url += "&category_id=" + categoryId;
    } else if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const catId = searchParams.get("id");
      if (catId) {
        url += "&category_id=" + catId;
      }
    }`;

const fetchReplacement = `let url = \`http://localhost:3000/api/products?limit=24&page=\${currentPage}\`;
    let activeCatId = categoryId;
    if (!activeCatId && typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      activeCatId = searchParams.get("id") || undefined;
    }

    if (activeCatId) {
      url += "&category_id=" + activeCatId;
    }`;
content = content.replace(fetchTarget, fetchReplacement);

// 3. Add fetch subcategories
const fetchEndTarget = `      })
      .catch(err => console.error("Error fetching products:", err));
  }, [categoryId, currentPage]);`;
const fetchEndReplacement = `      })
      .catch(err => console.error("Error fetching products:", err));

    if (activeCatId) {
      fetch(\`http://localhost:3000/api/categories?parentId=\${activeCatId}\`)
        .then(res => res.json())
        .then(res => {
          if (res.success) {
            setSubcategories(res.data);
          }
        })
        .catch(err => console.error("Error fetching subcategories:", err));
    }
  }, [categoryId, currentPage]);`;
content = content.replace(fetchEndTarget, fetchEndReplacement);

// 4. Regex replacement for category sidebar
const regex = /\{\/\*  Category  \*\/\}[\s\S]*?<div className="filter-content mt-3">[\s\S]*?<\/div>\s*<\/div>/;
const sidebarReplacement = `{/*  Category  */}
      <div className="filter-section open" data-group="category">
        <div className="filter-title" onClick={(e) => typeof window !== "undefined" && window.toggleFilter(e.currentTarget)}>
          <span className="flex items-center gap-2"><span className="text-sm">📁</span> Danh mục con</span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div className="filter-content mt-3">
          {subcategories.length > 0 ? (
            subcategories.map(subCat => (
              <label key={subCat.id} className="filter-checkbox cursor-pointer" onClick={() => { if(typeof window !== "undefined") window.location.href = subCat.slug; }}>
                <span className="flex-1 truncate hover:text-white transition-colors hover:underline text-cyan-400">{subCat.name}</span>
                {subCat.productCount > 0 && <span className="filter-count ml-1 text-gray-500">({subCat.productCount})</span>}
              </label>
            ))
          ) : (
            <p className="text-gray-500 text-xs italic">Không có danh mục con</p>
          )}
        </div>
      </div>`;

content = content.replace(regex, sidebarReplacement);

fs.writeFileSync('D:/web-tech/font-end/src/app/category/page.tsx', content);
