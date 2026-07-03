const fs = require('fs');
let content = fs.readFileSync('D:/web-tech/font-end/src/app/category/page.tsx', 'utf8');

// 1. Add AttributeFilterBlock
const attrBlock = `function AttributeFilterBlock({ attr, isLast }: { attr: any, isLast: boolean }) {
  const [showAll, setShowAll] = useState(false);
  return (
    <div className="filter-section open" style={isLast ? { borderBottom: 'none' } : {}} data-group={\`attr-\${attr.id}\`}>
      <div className="filter-title" onClick={(e) => typeof window !== "undefined" && window.toggleFilter(e.currentTarget)}>
        <span className="flex items-center gap-2">
          <span className="text-sm">{attr.icon || '📌'}</span> {attr.name}
        </span>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div className="filter-content mt-3 space-y-0.5">
        {attr.values.slice(0, showAll ? undefined : 5).map((val: any) => (
          <label key={val.id} className="filter-checkbox">
            <input type="checkbox" value={val.id} /> {val.name}
          </label>
        ))}
        {attr.values.length > 5 && (
          <button
            className="w-full text-[13px] text-gray-300 bg-[#1b1c1d] hover:bg-[#27272a] mt-3 py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Thu gọn" : \`Xem thêm \${attr.values.length - 5} mục\`}
            <svg 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              className={\`w-3 h-3 transition-transform \${showAll ? 'rotate-180' : ''}\`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

`;
if (!content.includes('AttributeFilterBlock')) {
  content = content.replace('export default function CategoryPage', attrBlock + 'export default function CategoryPage');
}

// 2. Add state for attributes
const stateTarget = 'const [subcategories, setSubcategories] = useState<any[]>([]);';
if (!content.includes('setAttributes')) {
  content = content.replace(stateTarget, stateTarget + '\n  const [attributes, setAttributes] = useState<any[]>([]);');
}

// 3. Add fetch logic
const fetchTarget = '.catch(err => console.error("Error fetching subcategories:", err));\n    }';
const fetchReplacement = `.catch(err => console.error("Error fetching subcategories:", err));

      fetch(\`http://localhost:3000/api/categories/attributes?categoryId=\${activeCatId}\`)
        .then(res => res.json())
        .then(res => {
          if (res.success) {
            setAttributes(res.data);
          }
        })
        .catch(err => console.error("Error fetching attributes:", err));
    }`;
if (!content.includes('/api/categories/attributes')) {
  content = content.replace(fetchTarget, fetchReplacement);
}

// 4. Replace hardcoded HTML
const htmlRegex = /\{\/\*  Brands  \*\/\}[\s\S]*?<div className="filter-section" style=\{\{ "borderBottom": "none" \}\} data-group="slot-width">[\s\S]*?<\/div>\r?\n      <\/div>/;
const htmlReplacement = `{attributes.map((attr, index) => (
        <AttributeFilterBlock key={attr.id} attr={attr} isLast={index === attributes.length - 1} />
      ))}`;
if (content.match(htmlRegex)) {
  content = content.replace(htmlRegex, htmlReplacement);
} else {
  console.log('HTML not matched!');
}

fs.writeFileSync('D:/web-tech/font-end/src/app/category/page.tsx', content);
