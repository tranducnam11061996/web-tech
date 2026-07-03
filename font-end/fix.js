const fs = require('fs');
let content = fs.readFileSync('D:/web-tech/font-end/src/app/category/page.tsx', 'utf8');

const regex = /  useEffect\(\(\) => \{[\s\S]*?catch\(err => console\.error\("Error fetching products:", err\)\);\r?\n  \}, \[categoryId, currentPage\]\);/;

const replacement = `  useEffect(() => {
    let url = \`http://localhost:3000/api/products?limit=24&page=\${currentPage}\`;
    let activeCatId = categoryId;
    if (!activeCatId && typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      activeCatId = searchParams.get("id") || undefined;
    }

    if (activeCatId) {
      url += "&category_id=" + activeCatId;
    }
    
    // Scroll to top when changing page
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

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

content = content.replace(regex, replacement);
fs.writeFileSync('D:/web-tech/font-end/src/app/category/page.tsx', content);
