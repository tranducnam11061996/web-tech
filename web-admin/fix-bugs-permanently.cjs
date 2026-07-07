const fs = require('fs');
const path = 'src/lib/admin/services.ts';

let src = fs.readFileSync(path, 'utf8');
const original = src;

// =========== Bug 1.1+1.2: Fix SKU uniqueness check ===========
const oldBlock = [
  "const skuRows = await connection.query<RowDataPacket[]>(",
  "    'SELECT id FROM idv_sell_product_store WHERE storeSKU = ? AND id <> ? LIMIT 1',",
  "    [sku, productId],",
  "  );",
  "  if (skuRows[0].length > 0) throw new AdminApiError(409, 'CONFLICT', 'SKU da ton tai');"
].join("\n");

const newBlock = [
  "const isUpdate = id !== undefined && id > 0;",
  "  const skuQuery =",
  "    'SELECT id FROM idv_sell_product_store WHERE storeSKU = ?' +",
  "    (isUpdate ? ' AND id <> ?' : '') +",
  "    ' LIMIT 1';",
  "  const skuBindings = isUpdate ? [sku, productId] : [sku];",
  "  const skuRows = await connection.query<RowDataPacket[]>(skuQuery, skuBindings);",
  "  if (skuRows.length > 0) throw new AdminApiError(409, 'CONFLICT', 'SKU da ton tai');"
].join("\n");

if (src.includes(oldBlock)) {
  src = src.replace(oldBlock, newBlock);
  console.log("Fixed Bug 1.1+1.2");
} else {
  console.log("Bug 1.1+1.2: NOT FOUND — checking manually...");
  // Try character by character match with indentation
  const marker = "skuRows[0].length > 0";
  if (src.includes(marker)) {
    console.log("Found marker:", marker);
    const idx = src.indexOf(marker);
    console.log("Context:", JSON.stringify(src.substring(idx - 100, idx + 100)));
  }
}

// =========== Bug 1.3: Fix article catId ===========
// We'll replace using a regex with the if (id) { ... } pattern
const catIdOld = "const primaryCategoryId = toInt(payload.catId, categoryIds[0]);";
if (src.includes(catIdOld)) {
  const replacement = "const existingForCat = id ? toInt((await connection.query('SELECT catId FROM idv_seller_news WHERE id = ? LIMIT 1', [id]))[0][0]?.catId) : 0;\n  const primaryCategoryId = payload.catId !== undefined ? toInt(payload.catId) : (existingForCat || toInt(categoryIds[0], 0));";
  src = src.replace(catIdOld, replacement);
  console.log("Fixed Bug 1.3");
} else {
  console.log("Bug 1.3: line not found");
}

if (src !== original) {
  fs.writeFileSync(path, src);
  console.log("\nFile written.");
} else {
  console.log("\nNo changes made.");
}
