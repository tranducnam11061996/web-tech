const fs = require('fs');
let content = fs.readFileSync('D:/web-tech/web-admin/src/app/api/categories/attributes/route.ts', 'utf8');
content = content.replace('a.id as attribute_id, a.name as attribute_name, a.icon as attribute_icon,', 'a.id as attribute_id, a.name as attribute_name, a.icon as attribute_icon, a.filter_code, a.attribute_code,');
content = content.replace('icon: row.attribute_icon,', 'icon: row.attribute_icon,\\n          filter_code: row.filter_code,\\n          attribute_code: row.attribute_code,');
fs.writeFileSync('D:/web-tech/web-admin/src/app/api/categories/attributes/route.ts', content);
