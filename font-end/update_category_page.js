const fs = require('fs');
let content = fs.readFileSync('D:/web-tech/font-end/src/app/category/page.tsx', 'utf8');

const regex = /export default function CategoryPage\(\{ categoryId \}: \{ categoryId\?: string \| number \}\) \{[\s\S]*?fetch\(url\)/;

const replacement = `export default function CategoryPage({ categoryId }: { categoryId?: string | number }) {
  const [products, setProducts] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [showAllSubcategories, setShowAllSubcategories] = useState(false);
  const searchParamsHook = useSearchParams();

  useEffect(() => {
    let url = \`http://localhost:3000/api/products?limit=24&page=\${currentPage}\`;
    let activeCatId = categoryId;
    if (!activeCatId && typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      activeCatId = searchParams.get("id") || undefined;
    }

    if (activeCatId) {
      url += "&category_id=" + activeCatId;
    }

    // Append extra filter attributes
    if (searchParamsHook) {
      searchParamsHook.forEach((value, key) => {
        if (!['id', 'page', 'limit', 'category_id'].includes(key)) {
          url += \`&\${encodeURIComponent(key)}=\${encodeURIComponent(value)}\`;
        }
      });
    }
    
    // Scroll to top when changing page
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    fetch(url)`;

content = content.replace(regex, replacement);

const depsRegex = /\}, \[categoryId, currentPage\]\);/;
content = content.replace(depsRegex, '}, [categoryId, currentPage, searchParamsHook]);');

fs.writeFileSync('D:/web-tech/font-end/src/app/category/page.tsx', content);
