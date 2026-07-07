const fs = require('fs');
const path = 'src/lib/admin/services.ts';
const src = fs.readFileSync(path, 'utf8');
const lines = src.split(/\r?\n/);
const n = lines.length;
console.log('File has', n, 'lines');

// Bug 1.1+1.2: Replace SKU check block
// Find lines 156-160
let modified = false;

// Check for the old SKU pattern: "skuRows[0].length > 0"
const oldPattern = "if (skuRows[0].length > 0) throw new AdminApiError(409, 'CONFLICT', 'SKU da ton tai');";
const patternIdx = src.indexOf(oldPattern);
console.log('SKU bug pattern at index:', patternIdx);

if (patternIdx >= 0) {
  // Find the start of the block (the query line)
  const queryStart = src.lastIndexOf('const skuRows = await connection.query<RowDataPacket[]>', patternIdx);
  console.log('Query start at index:', queryStart);

  if (queryStart >= 0) {
    // Find the semicolon end of the query statement
    const stmtEnd = src.indexOf(';', patternIdx) + 1;
    console.log('Statement end at index:', stmtEnd);

    const before = src.substring(0, queryStart);
    const after = src.substring(stmtEnd);

    const replacement = [
      "const isUpdate = id !== undefined && id > 0;",
      "  const skuQuery = 'SELECT id FROM idv_sell_product_store WHERE storeSKU = ?' + (isUpdate ? ' AND id <> ?' : '') + ' LIMIT 1';",
      "  const skuBindings = isUpdate ? [sku, productId] : [sku];",
      "  const skuRows = await connection.query<RowDataPacket[]>(skuQuery, skuBindings);",
      "  if (skuRows.length > 0) throw new AdminApiError(409, 'CONFLICT', 'SKU da ton tai');"
    ].join('\n  ');

    const newSrc = before + replacement + after;

    // Verify
    const newLines = newSrc.split(/\r?\n/);
    console.log('\nNew lines around SKU check:');
    const startLine = newLines.findIndex(l => l.includes('isUpdate') && l.includes('id > 0'));
    console.log('isUpdate at line:', startLine + 1);
    for (let i = startLine; i < startLine + 6 && i < newLines.length; i++) {
      console.log('  ' + (i+1) + ': ' + newLines[i]);
    }

    fs.writeFileSync(path, newSrc);
    console.log('\n✓ SKU fix applied!');
    modified = true;
  }
}

// Bug 1.3: Article catId
if (src.includes("const primaryCategoryId = toInt(payload.catId, categoryIds[0]);")) {
  console.log('\nFound article catId bug, fixing...');
  const catIdIdx = src.indexOf("const primaryCategoryId = toInt(payload.catId, categoryIds[0]);");
  const fix = [
    "const existingForCat = id ? toInt((await connection.query(",
    "    'SELECT catId FROM idv_seller_news WHERE id = ? LIMIT 1',",
    "    [id],",
    "  ))[0][0]?.catId) : 0;",
    "  const primaryCategoryId = payload.catId !== undefined",
    "    ? toInt(payload.catId)",
    "    : existingForCat || toInt(categoryIds[0], 0);"
  ].join('\n  ');

  const finalSrc = src.substring(0, catIdIdx) + fix + src.substring(catIdIdx + "const primaryCategoryId = toInt(payload.catId, categoryIds[0]);".length);
  fs.writeFileSync(path, finalSrc);
  console.log('✓ Article catId fix applied!');
} else {
  console.log('\nArticle catId: no longer found (may already be fixed)');
}

if (!modified) {
  console.log('\nNothing changed!');
}
