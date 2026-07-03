const fs = require('fs');
let content = fs.readFileSync('D:/web-tech/web-admin/src/app/api/products/route.ts', 'utf8');
content = content.replace('// Get total count', 'console.log(\\'Generated Query:\\', baseQuery, queryParams);\\n    // Get total count');
fs.writeFileSync('D:/web-tech/web-admin/src/app/api/products/route.ts', content);
