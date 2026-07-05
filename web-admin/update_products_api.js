const fs = require('fs');
let content = fs.readFileSync('D:/web-tech/web-admin/src/app/api/products/route.ts', 'utf8');

const replacement = `    const categoryId = searchParams.get('category_id');
    const limit = parseInt(searchParams.get('limit') || '24', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * limit;

    const slugify = (str: string) => {
      if (!str) return '';
      return str.toLowerCase()
        .normalize("NFD")
        .replace(/[\\u0300-\\u036f]/g, "")
        .replace(/đ/g, "d").replace(/Đ/g, "d")
        .replace(/[^a-z0-9\\- ]/g, '')
        .trim()
        .replace(/\\s+/g, '-');
    };

    let baseQuery = \`
      FROM idv_sell_product_store p
      LEFT JOIN idv_sell_product_price pr ON p.id = pr.id
      LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
      WHERE pr.isOn = 1
    \`;
    
    const queryParams: any[] = [];

    if (categoryId) {
      baseQuery += \` AND p.id IN (SELECT pro_id FROM idv_product_category WHERE category_id = ?)\`;
      queryParams.push(categoryId);
    }

    // Handle attribute filters
    const filterKeys = Array.from(searchParams.keys()).filter(k => !['category_id', 'limit', 'page', 'id'].includes(k));
    
    if (filterKeys.length > 0) {
      const [attrRows] = await pool.query(\`
        SELECT a.id as attr_id, a.name as attr_name, a.filter_code, v.id as val_id, v.value as val_name
        FROM idv_attribute a 
        JOIN idv_attribute_value v ON a.id = v.attributeId
      \`);

      for (const key of filterKeys) {
        const urlValues = searchParams.get(key)?.split(',') || [];
        if (urlValues.length === 0) continue;

        // Find attr_id
        let targetAttrId = null;
        let matchedVals: any[] = [];

        for (const row of (attrRows as any[])) {
          const rowKey = row.filter_code || slugify(row.attr_name);
          if (rowKey === key) {
            targetAttrId = row.attr_id;
            if (urlValues.includes(slugify(row.val_name))) {
              matchedVals.push(row.val_id);
            }
          }
        }

        if (targetAttrId && matchedVals.length > 0) {
          baseQuery += \` AND p.id IN (SELECT pro_id FROM idv_product_attribute WHERE attr_id = ? AND attr_value_id IN (?))\`;
          queryParams.push(targetAttrId, matchedVals);
        }
      }
    }`;

const regex = /const categoryId = searchParams\.get\('category_id'\);[\s\S]*?if \(categoryId\) \{\s*baseQuery \+= ` AND p\.id IN \(SELECT pro_id FROM idv_product_category WHERE category_id = \?\)`;\s*queryParams\.push\(categoryId\);\s*\}/;
content = content.replace(regex, replacement);

fs.writeFileSync('D:/web-tech/web-admin/src/app/api/products/route.ts', content);
