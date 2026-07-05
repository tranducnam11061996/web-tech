const fs = require('fs');
let content = fs.readFileSync('D:/web-tech/web-admin/src/app/api/categories/attributes/route.ts', 'utf8');

const regex = /SELECT[\s\S]*?ORDER BY ac.ordering DESC, v.ordering ASC/;

const newQuery = `SELECT 
        a.id as attribute_id, a.name as attribute_name, a.icon as attribute_icon, a.filter_code, a.attribute_code, 
        v.id as value_id, v.value as value_name,
        (
          SELECT COUNT(DISTINCT pa.pro_id) 
          FROM idv_product_attribute pa
          JOIN idv_product_category pc ON pa.pro_id = pc.pro_id
          JOIN idv_sell_product_price pr ON pa.pro_id = pr.id
          WHERE pa.attr_value_id = v.id AND pc.category_id = ? AND pr.isOn = 1
        ) as product_count
      FROM idv_attribute_category ac
      JOIN idv_attribute a ON ac.attr_id = a.id
      JOIN idv_attribute_value v ON a.id = v.attributeId
      WHERE ac.category_id = ?
      ORDER BY ac.ordering DESC, v.ordering ASC`;

content = content.replace(regex, newQuery);

content = content.replace('[parseInt(categoryId, 10)]', '[parseInt(categoryId, 10), parseInt(categoryId, 10)]');
content = content.replace('name: row.value_name', 'name: row.value_name,\n        productCount: row.product_count');

fs.writeFileSync('D:/web-tech/web-admin/src/app/api/categories/attributes/route.ts', content);
