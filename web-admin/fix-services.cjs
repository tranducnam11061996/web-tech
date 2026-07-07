const fs = require('fs');
const path = 'src/lib/admin/services.ts';

// Read raw bytes to detect line endings
const buf = fs.readFileSync(path);
let lineEnding = '\n';
if (buf.includes(Buffer.from('\r\n'))) lineEnding = '\r\n';
console.log('Line ending:', JSON.stringify(lineEnding));

let src = buf.toString('utf8');

// Find the dead requireText line (Bug 1.4)
const deadPattern = "requireText(payload.name || payload.proName, 'name', 'Ten san pham');" + lineEnding;
if (src.includes(deadPattern)) {
  // It's on its own line (with indentation)
  src = src.replace(
    new RegExp("  " + deadPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    ''
  );
  console.log('Bug 1.4: removed dead requireText line');
} else {
  console.log('Bug 1.4: dead line not found (maybe already fixed)');
}

// Find SKU check block (Bug 1.1+1.2) — use substring search
const skuMarker = "const skuRows = await connection.query<RowDataPacket[]>";
const skuIdx = src.indexOf(skuMarker);
if (skuIdx >= 0) {
  // Find the end of the block (the throw line)
  const throwMarker = "if (skuRows[0].length > 0) throw new AdminApiError(409, 'CONFLICT', 'SKU da ton tai');";
  const throwIdx = src.indexOf(throwMarker, skuIdx);
  if (throwIdx >= 0) {
    const endIdx = throwIdx + throwMarker.length;
    const before = src.substring(0, skuIdx);
    const after = src.substring(endIdx);

    const replacement =
      "const isUpdate = id !== undefined && id > 0;" + lineEnding +
      "  const skuQuery =" + lineEnding +
      "    'SELECT id FROM idv_sell_product_store WHERE storeSKU = ?' +" + lineEnding +
      "    (isUpdate ? ' AND id <> ?' : '') +" + lineEnding +
      "    ' LIMIT 1';" + lineEnding +
      "  const skuBindings = isUpdate ? [sku, productId] : [sku];" + lineEnding +
      "  const skuRows = await connection.query<RowDataPacket[]>(skuQuery, skuBindings);" + lineEnding +
      "  if (skuRows.length > 0) throw new AdminApiError(409, 'CONFLICT', 'SKU da ton tai');";

    src = before + replacement + after;
    console.log('Bug 1.1+1.2: fixed SKU check block');
  } else {
    console.log('Bug 1.1+1.2: throw line not found');
  }
} else {
  console.log('Bug 1.1+1.2: SKU marker not found');
}

// Find article catId line (Bug 1.3)
const catIdMarker = "const primaryCategoryId = toInt(payload.catId, categoryIds[0]);";
const catIdIdx = src.indexOf(catIdMarker);
if (catIdIdx >= 0) {
  const before = src.substring(0, catIdIdx);
  const after = src.substring(catIdIdx + catIdMarker.length);

  const replacement =
    "const existingCatId = id ? toInt((await connection.query('SELECT catId FROM idv_seller_news WHERE id = ? LIMIT 1', [id]))[0][0]?.catId) : 0;" + lineEnding +
    "  const primaryCategoryId = payload.catId !== undefined ? toInt(payload.catId) : (existingCatId || toInt(categoryIds[0], 0));";

  src = before + replacement + after;
  console.log('Bug 1.3: fixed article catId preservation');
} else {
  console.log('Bug 1.3: catId marker not found');
}

fs.writeFileSync(path, src);
console.log('\nVerification:');
const lines = src.split(/\r?\n/);

// Show lines 139-170
for (let i = 138; i < 170 && i < lines.length; i++) {
  if (lines[i].includes('sku') || lines[i].includes('requireText') || lines[i].includes('primary') || lines[i].includes('catId') || lines[i].includes('isUpdate')) {
    console.log('  L' + (i+1) + ': ' + lines[i]);
  }
}

// Verify Bug 1.4
const hasDead = src.includes("requireText(payload.name || payload.proName, 'name', 'Ten san pham');");
console.log('\nBug 1.4 - Dead requireText still exists:', hasDead);

// Verify Bug 1.1
const hasOldSku = src.includes('skuRows[0].length');
console.log('Bug 1.1 - Old skuRows[0].length still exists:', hasOldSku);

// Verify Bug 1.2
const hasNoUpdateGuard = src.includes("AND id <> ?") && !src.includes('isUpdate');
console.log('Bug 1.2 - No isUpdate guard:', hasNoUpdateGuard);

console.log('\nAll done!');
