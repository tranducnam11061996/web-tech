const fs = require('fs');
let c = fs.readFileSync('D:/web-tech/font-end/src/app/category/page.tsx', 'utf8');
c = c.replace('}\\n\\nexport default', '}\n\nexport default');
fs.writeFileSync('D:/web-tech/font-end/src/app/category/page.tsx', c);
