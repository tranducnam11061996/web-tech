const fs = require('fs');
const path = 'src/lib/admin/services.ts';

let src = fs.readFileSync(path, 'utf8');

// === Bug 1.1+1.2: Fix SKU uniqueness check ===
const oldSku = [
  "const skuRows = await connection.query<RowDataPacket[]>(",
  "    'SELECT id FROM idv_sell_product_store WHERE storeSKU = ? AND id <> ? LIMIT 1',",
  "    [sku, productId],",
  "  );",
  "  if (skuRows[0].length > 0) throw new AdminApiError(409, 'CONFLICT', 'SKU da ton tai');"
].join("\n");

const newSku = [
  "const isUpdate = id !== undefined && id > 0;",
  "  const skuQuery =",
  "    'SELECT id FROM idv_sell_product_store WHERE storeSKU = ?' +",
  "    (isUpdate ? ' AND id <> ?' : '') +",
  "    ' LIMIT 1';",
  "  const skuBindings = isUpdate ? [sku, productId] : [sku];",
  "  const skuRows = await connection.query<RowDataPacket[]>(skuQuery, skuBindings);",
  "  if (skuRows.length > 0) throw new AdminApiError(409, 'CONFLICT', 'SKU da ton tai');"
].join("\n");

if (src.includes(oldSku)) {
  src = src.replace(oldSku, newSku);
  console.log("✓ Fixed Bug 1.1+1.2: SKU uniqueness check");
} else {
  console.log("✗ Bug 1.1+1.2: old pattern not found (may already be fixed)");
}

// === Bug 1.3: Fix article catId ===
const oldCatId = "const primaryCategoryId = toInt(payload.catId, categoryIds[0]);";
const newCatId = [
  "const existingForCat = id ? toInt((await connection.query(",
  "    'SELECT catId FROM idv_seller_news WHERE id = ? LIMIT 1',",
  "    [id],",
  "  ))[0][0]?.catId) : 0;",
  "  const primaryCategoryId = payload.catId !== undefined",
  "    ? toInt(payload.catId)",
  "    : existingForCat || toInt(categoryIds[0], 0);"
].join("\n  ");

if (src.includes(oldCatId)) {
  src = src.replace(oldCatId, newCatId);
  console.log("✓ Fixed Bug 1.3: article catId preservation");
} else {
  console.log("✗ Bug 1.3: old pattern not found");
}

// === Bug 1.4: Verify dead code removed ===
const deadText = "requireText(payload.name || payload.proName, 'name', 'Ten san pham');";
if (src.includes(deadText)) {
  console.log("⚠ Bug 1.4: dead requireText line still exists!");
} else {
  console.log("✓ Bug 1.4: dead requireText line already removed");
}

if (src !== fs.readFileSync(path, 'utf8')) {
  fs.writeFileSync(path, src);
  console.log("\nFile written. Verifying...\n");
} else {
  console.log("\nNo changes needed.");
}

const lines = src.split(/\r?\n/);
console.log("=== Lines 155-170 (SKU block) ===");
for (let i = 154; i < 170 && i < lines.length; i++) {
  console.log(`  ${i+1}: ${lines[i]}`);
}

console.log("\n=== Lines around catId (~line 500) ===");
for (let i = 490; i < 510 && i < lines.length; i++) {
  if (lines[i].includes('catId') || lines[i].includes('categoryIds')) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}
