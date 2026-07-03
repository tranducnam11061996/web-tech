const fs = require('fs');
let content = fs.readFileSync('D:/web-tech/font-end/src/app/category/page.tsx', 'utf8');

// Ensure useRouter is imported
if (!content.includes('useRouter')) {
  content = content.replace('import { useEffect, useState } from "react";', 'import { useEffect, useState } from "react";\nimport { useRouter, useSearchParams } from "next/navigation";');
}

const newAttrBlock = `const slugify = (str: string) => {
  if (!str) return '';
  return str.toLowerCase()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "d")
    .replace(/[^a-z0-9\\- ]/g, '')
    .trim()
    .replace(/\\s+/g, '-');
};

function AttributeFilterBlock({ attr, isLast, isOpen }: { attr: any, isLast: boolean, isOpen: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const filterKey = attr.filter_code || slugify(attr.name);
  const currentValues = searchParams.get(filterKey)?.split(',') || [];

  const handleToggle = (valName: string) => {
    const valSlug = slugify(valName);
    const newParams = new URLSearchParams(searchParams.toString());
    
    let newValues = [...currentValues];
    if (newValues.includes(valSlug)) {
      newValues = newValues.filter(v => v !== valSlug);
    } else {
      newValues.push(valSlug);
    }
    
    if (newValues.length > 0) {
      newParams.set(filterKey, newValues.join(','));
    } else {
      newParams.delete(filterKey);
    }
    
    // Maintain current route
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    router.push(currentPath + '?' + newParams.toString(), { scroll: false });
  };

  return (
    <div className={\`filter-section \${isOpen ? 'open' : ''}\`} style={isLast ? { borderBottom: 'none' } : {}} data-group={\`attr-\${attr.id}\`}>
      <div className="filter-title" onClick={(e) => typeof window !== "undefined" && window.toggleFilter(e.currentTarget)}>
        <span className="flex items-center gap-2">
          <span className="text-sm">{attr.icon || '📌'}</span> {attr.name}
        </span>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div className="filter-content mt-3 space-y-0.5" style={!isOpen ? { display: 'none' } : {}}>
        {attr.values.slice(0, showAll ? undefined : 5).map((val: any) => {
          const valSlug = slugify(val.name);
          const isChecked = currentValues.includes(valSlug);
          return (
            <label key={val.id} className="filter-checkbox cursor-pointer" onClick={(e) => e.preventDefault()}>
              <input type="checkbox" value={val.id} checked={isChecked} onChange={() => handleToggle(val.name)} /> 
              <span className="flex-1 truncate hover:text-white transition-colors ml-2" onClick={(e) => { e.preventDefault(); handleToggle(val.name); }}>{val.name}</span>
            </label>
          );
        })}
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
}`;

const oldBlockRegex = /function AttributeFilterBlock[\s\S]*?\}\s*export default function CategoryPage/m;
content = content.replace(oldBlockRegex, newAttrBlock + '\\n\\nexport default function CategoryPage');

fs.writeFileSync('D:/web-tech/font-end/src/app/category/page.tsx', content);
