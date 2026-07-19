import { createHash, randomBytes } from "crypto";
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { buildCartQuote } from "@/lib/cart-quote";
import { resolveProductImageUrl } from "@/lib/productImageUrl";
import { PublicRequestError } from "@/lib/publicRequest";
import type {
  PcBuilderComponentCode,
  PcBuilderDiagnostic,
  PcBuilderFact,
  PcBuilderQuote,
  PcBuilderSelection,
} from "./types";
import {
  buildPcBuilderConfigurationVersion,
  hasPcBuilderCatalogLive,
  loadPcBuilderComponents,
  loadPcBuilderRelations,
  type PcBuilderAttributeRelation,
  type PcBuilderComponentConfig,
} from "./configuration";

type DbExecutor = Pool | PoolConnection;
type RuleRow = RowDataPacket & {
  code: string;
  severity: "error" | "warning" | "info";
  operator: "equality";
  left_component: PcBuilderComponentCode;
  left_fact: string;
  right_component: PcBuilderComponentCode;
  right_fact: string;
  message: string;
  revision: string;
};

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function assertPcBuilderFeature(auto = false) {
  if (process.env.PC_BUILDER_ENABLED !== "true")
    throw new PublicRequestError(503, "PC_BUILDER_DISABLED", "PC Builder chưa được mở.");
  if (auto)
    throw new PublicRequestError(
      503,
      "PC_BUILDER_AUTO_DISABLED",
      "Gaming tự động đang tạm dừng trong giai đoạn catalog-live.",
    );
}

function normalizeSet(values: unknown) {
  return Array.isArray(values)
    ? values.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
    : [];
}

function overlaps(left: unknown, right: unknown) {
  const rightSet = new Set(normalizeSet(right));
  return normalizeSet(left).some((value) => rightSet.has(value));
}

export function evaluatePcBuilderCompatibility(
  facts: PcBuilderFact[],
  rules: RuleRow[],
  selections: PcBuilderSelection[],
  options?: { components?: PcBuilderComponentConfig[] },
): PcBuilderDiagnostic[] {
  const diagnostics: PcBuilderDiagnostic[] = [];
  const byComponent = new Map<PcBuilderComponentCode, PcBuilderFact[]>();
  for (const fact of facts)
    byComponent.set(fact.componentCode, [
      ...(byComponent.get(fact.componentCode) || []),
      fact,
    ]);

  for (const component of options?.components || []) {
    const selectedCount = selections
      .filter((selection) => selection.componentCode === component.code)
      .reduce((total, selection) => total + selection.quantity, 0);
    if (component.required && selectedCount < component.minSelections)
      diagnostics.push({
        ruleCode: `missing_required_${component.code}`,
        severity: "warning",
        message: `Cấu hình chưa có ${component.name}.`,
        componentCodes: [component.code],
      });
    if (selectedCount > component.maxSelections)
      diagnostics.push({
        ruleCode: `${component.code}_selection_limit`,
        severity: "error",
        message: `${component.name} vượt giới hạn ${component.maxSelections} sản phẩm.`,
        componentCodes: [component.code],
      });
  }

  for (const rule of rules) {
    const leftFacts = byComponent.get(rule.left_component) || [];
    const rightFacts = byComponent.get(rule.right_component) || [];
    if (!leftFacts.length || !rightFacts.length) continue;
    for (const left of leftFacts)
      for (const right of rightFacts) {
        const attributeCode = rule.left_fact.slice(5);
        const leftValue = left.attributes[attributeCode];
        const rightValue = right.attributes[attributeCode];
        if (!leftValue?.length || !rightValue?.length)
          diagnostics.push({
            ruleCode: `${rule.code}_missing_attribute`,
            severity: "error",
            message: `Thiếu thuộc tính để kiểm tra: ${rule.message}`,
            componentCodes: [rule.left_component, rule.right_component],
          });
        else if (!overlaps(leftValue, rightValue))
          diagnostics.push({
            ruleCode: rule.code,
            severity: "error",
            message: rule.message,
            componentCodes: [rule.left_component, rule.right_component],
          });
      }
  }

  return Array.from(
    new Map(
      diagnostics.map((item) => [
        `${item.ruleCode}:${item.componentCodes.join(",")}`,
        item,
      ]),
    ).values(),
  );
}

async function loadRuntimeConfiguration(db: DbExecutor) {
  if (!(await hasPcBuilderCatalogLive(db)))
    throw new PublicRequestError(
      503,
      "PC_BUILDER_MIGRATION_REQUIRED",
      "PC Builder cần được nâng cấp lên catalog-live trước khi sử dụng.",
    );
  const [components, relations] = await Promise.all([
    loadPcBuilderComponents(db, true),
    loadPcBuilderRelations(db),
  ]);
  const configurationVersion = buildPcBuilderConfigurationVersion(
    components,
    relations,
  );
  const activeComponents = components.filter((component) => component.status);
  const enforceableRelations = relations.filter(
    (relation) => relation.enforceable,
  );
  const rules = enforceableRelations.map(
    (relation, index): RuleRow =>
      ({
        id: index,
        code: `relation_${relation.componentCode}_${relation.relatedComponentCode}_${relation.attributeId}`,
        severity: "error",
        operator: "equality",
        left_component: relation.componentCode,
        left_fact: `attr:${relation.attributeCode}`,
        right_component: relation.relatedComponentCode,
        right_fact: `attr:${relation.attributeCode}`,
        message: `${relation.attributeName} giữa hai linh kiện không tương thích.`,
        revision: configurationVersion,
      }) as RuleRow,
  );
  return {
    components,
    activeComponents,
    relations: enforceableRelations,
    rules,
    revision: stableHash({
      mode: "catalog-live-v4",
      version: configurationVersion,
      relations,
    }),
  };
}

function validateSelections(selections: PcBuilderSelection[]) {
  const keys = new Set<string>();
  const productIds = new Set<number>();
  for (const selection of selections) {
    const key = `${selection.componentCode}:${selection.productId}`;
    if (keys.has(key))
      throw new PublicRequestError(400, "DUPLICATE_SELECTION", "Sản phẩm bị lặp trong cùng nhóm linh kiện.");
    if (productIds.has(selection.productId))
      throw new PublicRequestError(400, "DUPLICATE_PRODUCT", "Một sản phẩm không thể nằm trong nhiều nhóm linh kiện.");
    keys.add(key);
    productIds.add(selection.productId);
  }
}

async function normalizeLegacyStorageSelections(db: DbExecutor, selections: PcBuilderSelection[]) {
  const legacyIds = selections
    .filter((selection) => selection.componentCode === "storage")
    .map((selection) => selection.productId);
  if (!legacyIds.length) return selections;
  const [rows] = await db.query<RowDataPacket[]>(
    `WITH RECURSIVE tree AS (
      SELECT code,category_id id FROM web_admin_pc_builder_components
      WHERE status=1 AND code IN ('ssd','hdd') AND category_id IS NOT NULL
      UNION ALL SELECT tree.code,category.id FROM tree
      JOIN idv_seller_category category ON category.parentId=tree.id WHERE category.status=1
    ) SELECT DISTINCT tree.code,pc.pro_id FROM tree
      JOIN idv_product_category pc ON pc.category_id=tree.id
      WHERE pc.pro_id IN (?) ORDER BY FIELD(tree.code,'ssd','hdd')`,
    [legacyIds],
  );
  const codeByProduct = new Map<number, string>();
  for (const row of rows)
    if (!codeByProduct.has(Number(row.pro_id)))
      codeByProduct.set(Number(row.pro_id), String(row.code));
  if (legacyIds.some((id) => !codeByProduct.has(id)))
    throw new PublicRequestError(409, "COMPONENT_CATEGORY_MISMATCH", "Ổ lưu trữ cũ không còn thuộc danh mục SSD/HDD đang hoạt động.");
  return selections.map((selection) =>
    selection.componentCode === "storage"
      ? { ...selection, componentCode: codeByProduct.get(selection.productId)! }
      : selection,
  );
}

async function loadCatalogFacts(
  db: DbExecutor,
  selections: PcBuilderSelection[],
  components: PcBuilderComponentConfig[],
) {
  const ids = Array.from(new Set(selections.map((item) => item.productId)));
  if (!ids.length)
    return { facts: [] as PcBuilderFact[], catalogRevisionSeed: stableHash([]) };
  const codes = Array.from(new Set(selections.map((item) => item.componentCode)));
  const componentByCode = new Map(components.map((component) => [component.code, component]));
  const [memberships] = await db.query<RowDataPacket[]>(
    `WITH RECURSIVE tree AS (
      SELECT code,category_id id FROM web_admin_pc_builder_components
      WHERE code IN (?) AND category_id IS NOT NULL
      UNION ALL SELECT tree.code,category.id FROM tree
      JOIN idv_seller_category category ON category.parentId=tree.id WHERE category.status=1
    ) SELECT DISTINCT tree.code,tree.id category_id,pc.pro_id FROM tree
      JOIN idv_product_category pc ON pc.category_id=tree.id WHERE pc.pro_id IN (?)`,
    [codes, ids],
  );
  const membershipSet = new Set(memberships.map((row) => `${row.code}:${Number(row.pro_id)}`));
  if (
    selections.some(
      (selection) =>
        !componentByCode.get(selection.componentCode)?.status ||
        !componentByCode.get(selection.componentCode)?.categoryId ||
        !membershipSet.has(`${selection.componentCode}:${selection.productId}`),
    )
  )
    throw new PublicRequestError(409, "COMPONENT_CATEGORY_MISMATCH", "Sản phẩm không thuộc danh mục linh kiện đã cấu hình.");

  const [[attributes], [prices]] = await Promise.all([
    db.query<RowDataPacket[]>(
      `SELECT pa.pro_id,pa.attr_id,pa.attr_value_id,attribute.attribute_code
       FROM idv_product_attribute pa
       JOIN idv_attribute attribute ON attribute.id=pa.attr_id AND attribute.status=1
       JOIN idv_attribute_value value ON value.id=pa.attr_value_id AND value.attributeId=attribute.id
       WHERE pa.pro_id IN (?) ORDER BY pa.pro_id,pa.attr_id,pa.attr_value_id`,
      [ids],
    ),
    db.query<RowDataPacket[]>(
      "SELECT id,price,isOn,lastUpdate FROM idv_sell_product_price WHERE id IN (?)",
      [ids],
    ),
  ]);
  const priceById = new Map(prices.map((row) => [Number(row.id), row]));
  if (ids.some((id) => !priceById.get(id) || Number(priceById.get(id)!.isOn) !== 1 || Number(priceById.get(id)!.price || 0) <= 0))
    throw new PublicRequestError(409, "BUILD_UNAVAILABLE", "Một hoặc nhiều linh kiện không còn bán hoặc không có giá hợp lệ.");

  const facts = selections.map((selection): PcBuilderFact => {
    const fact: PcBuilderFact = {
      productId: selection.productId,
      componentCode: selection.componentCode,
      attributes: {},
      metrics: {},
    };
    for (const row of attributes) {
      if (Number(row.pro_id) !== selection.productId) continue;
      const code = String(row.attribute_code || "").trim();
      if (code) fact.attributes[code] = [...(fact.attributes[code] || []), String(row.attr_value_id)];
    }
    return fact;
  });
  return {
    facts,
    catalogRevisionSeed: stableHash({
      assignments: selections.map((item) => [item.componentCode, item.productId]).sort(),
      memberships: memberships.map((row) => [row.code, Number(row.category_id), Number(row.pro_id)]).sort(),
      attributes: attributes.map((row) => [Number(row.pro_id), Number(row.attr_id), Number(row.attr_value_id)]).sort(),
      prices: prices.map((row) => [Number(row.id), Number(row.price), Number(row.isOn), String(row.lastUpdate || "")]).sort(),
    }),
  };
}

export async function buildPcBuilderQuote(
  selections: PcBuilderSelection[],
  options?: { db?: DbExecutor; assemblyRequired?: boolean; ruleStatus?: "draft" | "published"; ruleRevision?: string },
): Promise<PcBuilderQuote> {
  validateSelections(selections);
  const db = options?.db || pool;
  const runtime = await loadRuntimeConfiguration(db);
  const normalizedSelections = await normalizeLegacyStorageSelections(db, selections);
  validateSelections(normalizedSelections);
  const componentByCode = new Map(runtime.components.map((component) => [component.code, component]));
  for (const selection of normalizedSelections) {
    const component = componentByCode.get(selection.componentCode);
    if (!component?.status)
      throw new PublicRequestError(400, "INVALID_COMPONENT", "Danh mục linh kiện không còn hoạt động trong PC Builder.");
    if (selection.quantity !== 1)
      throw new PublicRequestError(400, "INVALID_SELECTION_QUANTITY", "Mỗi mẫu linh kiện chỉ được thêm một lần.");
  }
  const [loaded, cart] = await Promise.all([
    loadCatalogFacts(db, normalizedSelections, runtime.components),
    buildCartQuote(normalizedSelections.map((item) => ({ productId: item.productId, quantity: item.quantity })), { db }),
  ]);
  const selectionByProduct = new Map(normalizedSelections.map((item) => [item.productId, item]));
  const diagnostics = evaluatePcBuilderCompatibility(loaded.facts, runtime.rules, normalizedSelections, {
    components: runtime.activeComponents,
  });
  for (const item of cart.items)
    if (!item.available)
      diagnostics.push({
        ruleCode: `catalog_${item.reason || "unavailable"}`,
        severity: "error",
        message: `${item.name} không còn bán hoặc không có giá hợp lệ.`,
        componentCodes: [selectionByProduct.get(item.productId)?.componentCode || "unknown"],
      });
  const items = cart.items.map((item) => ({
    componentCode: selectionByProduct.get(item.productId)!.componentCode,
    productId: item.productId,
    quantity: item.quantity,
    name: item.name,
    sku: item.sku,
    slug: item.slug,
    thumbnail: item.thumbnail,
    price: item.price,
    lineTotal: item.lineTotal,
    available: item.available,
  }));
  const missingRequiredComponents = runtime.activeComponents
    .filter((component) => component.required)
    .map((component) => ({
      componentCode: component.code,
      name: component.name,
      minSelections: component.minSelections,
      selectedCount: normalizedSelections.filter((item) => item.componentCode === component.code).length,
    }))
    .filter((component) => component.selectedCount < component.minSelections);
  const catalogRevision = stableHash({
    seed: loaded.catalogRevisionSeed,
    prices: items.map((item) => [item.productId, item.price]),
  });
  const fingerprint = stableHash({
    selections: [...normalizedSelections].sort((a, b) => a.componentCode.localeCompare(b.componentCode) || a.productId - b.productId),
    ruleRevision: runtime.revision,
    catalogRevision,
    prices: items.map((item) => [item.productId, item.price]),
  });
  const warningSignature = stableHash(
    diagnostics
      .filter((diagnostic) => diagnostic.severity === "warning")
      .map((diagnostic) => [diagnostic.ruleCode, [...diagnostic.componentCodes].sort(), diagnostic.message])
      .sort(),
  );
  return {
    items,
    totals: { subtotal: cart.totals.subtotal, assemblyFee: 0, total: cart.totals.subtotal, itemCount: cart.totals.itemCount },
    diagnostics,
    compatible: !diagnostics.some((item) => item.severity === "error"),
    requiresConfirmation: diagnostics.some((item) => item.severity === "warning"),
    missingRequiredComponents,
    ruleRevision: runtime.revision,
    catalogRevision,
    fingerprint,
    warningSignature,
  };
}

export async function getPcBuilderBootstrap() {
  if (!(await hasPcBuilderCatalogLive(pool)))
    return {
      data: { enabled: false, manualReady: false, ruleRevision: "", components: [], coverage: [], minimumBudget: 0, migrationRequired: true },
      etag: '"pc-builder-v4-not-installed"',
    };
  const runtime = await loadRuntimeConfiguration(pool);
  const active = runtime.activeComponents.filter((component) => component.categoryId);
  const [minimumRows] = active.some((component) => component.required)
    ? await pool.query<RowDataPacket[]>(
        `WITH RECURSIVE tree AS (
          SELECT code,category_id id FROM web_admin_pc_builder_components WHERE status=1 AND is_required=1 AND category_id IS NOT NULL
          UNION ALL SELECT tree.code,category.id FROM tree JOIN idv_seller_category category ON category.parentId=tree.id WHERE category.status=1
        ) SELECT tree.code,MIN(price.price) minimum_price FROM tree
          JOIN idv_product_category pc ON pc.category_id=tree.id
          JOIN idv_sell_product_price price ON price.id=pc.pro_id AND price.isOn=1 AND price.price>0
          GROUP BY tree.code`,
      )
    : [[]];
  const data = {
    enabled: process.env.PC_BUILDER_ENABLED === "true" && active.length > 0,
    manualReady: active.length > 0,
    disabledReason: active.length ? "" : "COMPONENT_CONFIGURATION_EMPTY",
    ruleRevision: runtime.revision,
    components: active.map((component) => ({
      code: component.code,
      categoryId: component.categoryId,
      name: component.name,
      required: component.required,
      minSelections: component.minSelections,
      maxSelections: component.maxSelections,
      ordering: component.ordering,
    })),
    coverage: [],
    minimumBudget: minimumRows.reduce((total, row) => total + Number(row.minimum_price || 0), 0),
  };
  return { data, etag: `"${stableHash(data).slice(0, 32)}"` };
}

type CandidateFilterInput = {
  componentCode: PcBuilderComponentCode;
  selections: PcBuilderSelection[];
  page: number;
  limit: number;
  query: string;
  brandIds: number[];
  minPrice: number | null;
  maxPrice: number | null;
  sort: "default" | "price_asc" | "price_desc" | "newest";
  attributeFilters: Record<string, number[]>;
};

type AppliedRelation = PcBuilderAttributeRelation & {
  selectedComponentCode: string;
  selectedProductIds: number[];
  valuesByProduct: Map<number, number[]>;
};

function candidateUniverseSql() {
  return `WITH RECURSIVE tree AS (
    SELECT id FROM idv_seller_category WHERE id=? AND status=1
    UNION ALL SELECT category.id FROM idv_seller_category category JOIN tree ON category.parentId=tree.id WHERE category.status=1
  ), universe AS (
    SELECT DISTINCT store.id,store.proName,store.storeSKU,store.proThum,store.brandId,store.warranty,
      price.price,price.market_price FROM tree
    JOIN idv_product_category pc ON pc.category_id=tree.id
    JOIN idv_sell_product_store store ON store.id=pc.pro_id
    JOIN idv_sell_product_price price ON price.id=store.id AND price.isOn=1 AND price.price>0
  )`;
}

function candidateConditions(
  input: CandidateFilterInput,
  appliedRelations: AppliedRelation[],
  options: { excludePrice?: boolean; excludeBrand?: boolean; facetAttributeAlias?: string } = {},
) {
  const where: string[] = [];
  const values: unknown[] = [];
  for (const relation of appliedRelations)
    for (const productId of relation.selectedProductIds) {
      const valueIds = relation.valuesByProduct.get(productId) || [];
      where.push(`EXISTS (SELECT 1 FROM idv_product_attribute relation_pa
        WHERE relation_pa.pro_id=product.id AND relation_pa.attr_id=? AND relation_pa.attr_value_id IN (?))`);
      values.push(relation.attributeId, valueIds.length ? valueIds : [-1]);
    }
  if (input.query) {
    where.push("(product.proName LIKE ? OR product.storeSKU LIKE ?)");
    values.push(`%${input.query}%`, `%${input.query}%`);
  }
  if (!options.excludeBrand && input.brandIds.length) {
    where.push("product.brandId IN (?)");
    values.push(input.brandIds);
  }
  if (!options.excludePrice && input.minPrice !== null) {
    where.push("product.price>=?");
    values.push(input.minPrice);
  }
  if (!options.excludePrice && input.maxPrice !== null) {
    where.push("product.price<=?");
    values.push(input.maxPrice);
  }
  for (const [attributeId, selectedValues] of Object.entries(input.attributeFilters)) {
    if (!selectedValues.length) continue;
    const filter = `EXISTS (SELECT 1 FROM idv_product_attribute filter_pa
      WHERE filter_pa.pro_id=product.id AND filter_pa.attr_id=? AND filter_pa.attr_value_id IN (?))`;
    if (options.facetAttributeAlias)
      where.push(`(${options.facetAttributeAlias}.id=? OR ${filter})`);
    else where.push(filter);
    if (options.facetAttributeAlias) values.push(Number(attributeId));
    values.push(Number(attributeId), selectedValues);
  }
  return { sql: where.length ? where.join(" AND ") : "1=1", values };
}

async function appliedCandidateRelations(
  relations: PcBuilderAttributeRelation[],
  componentCode: string,
  selections: PcBuilderSelection[],
) {
  const applicable = relations
    .map((relation) => {
      if (relation.componentCode === componentCode) return { relation, opposite: relation.relatedComponentCode };
      if (relation.relatedComponentCode === componentCode) return { relation, opposite: relation.componentCode };
      return null;
    })
    .filter((entry): entry is { relation: PcBuilderAttributeRelation; opposite: string } => Boolean(entry))
    .map((entry) => ({ ...entry, selected: selections.filter((item) => item.componentCode === entry.opposite) }))
    .filter((entry) => entry.selected.length > 0);
  if (!applicable.length) return [];
  const productIds = Array.from(new Set(applicable.flatMap((entry) => entry.selected.map((item) => item.productId))));
  const attributeIds = Array.from(new Set(applicable.map((entry) => entry.relation.attributeId)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT pro_id,attr_id,attr_value_id FROM idv_product_attribute
     WHERE pro_id IN (?) AND attr_id IN (?) ORDER BY pro_id,attr_id,attr_value_id`,
    [productIds, attributeIds],
  );
  return applicable.map((entry): AppliedRelation => {
    const valuesByProduct = new Map<number, number[]>();
    for (const selection of entry.selected)
      valuesByProduct.set(
        selection.productId,
        rows
          .filter((row) => Number(row.pro_id) === selection.productId && Number(row.attr_id) === entry.relation.attributeId)
          .map((row) => Number(row.attr_value_id)),
      );
    return {
      ...entry.relation,
      selectedComponentCode: entry.opposite,
      selectedProductIds: entry.selected.map((item) => item.productId),
      valuesByProduct,
    };
  });
}

export async function listPcBuilderCandidates(input: CandidateFilterInput) {
  validateSelections(input.selections);
  const runtime = await loadRuntimeConfiguration(pool);
  const normalizedSelections = await normalizeLegacyStorageSelections(pool, input.selections);
  if (normalizedSelections.length)
    await loadCatalogFacts(pool, normalizedSelections, runtime.components);
  const component = runtime.activeComponents.find((item) => item.code === input.componentCode);
  if (!component?.categoryId)
    throw new PublicRequestError(400, "INVALID_COMPONENT", "Danh mục linh kiện không hợp lệ.");
  const appliedRelations = await appliedCandidateRelations(runtime.relations, input.componentCode, normalizedSelections);
  const universeSql = candidateUniverseSql();
  const filters = candidateConditions(input, appliedRelations);
  const [countRows] = await pool.query<RowDataPacket[]>(
    `${universeSql} SELECT COUNT(*) total FROM universe product WHERE ${filters.sql}`,
    [component.categoryId, ...filters.values],
  );
  const total = Number(countRows[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / input.limit));
  const page = Math.min(input.page, totalPages);
  const orderBy =
    input.sort === "price_asc"
      ? "product.price ASC,product.id DESC"
      : input.sort === "price_desc"
        ? "product.price DESC,product.id DESC"
        : "product.id DESC";
  const [rows] = await pool.query<RowDataPacket[]>(
    `${universeSql} SELECT product.*,
      brand.name brandName,
      (SELECT request_path FROM idv_url WHERE id_path=CONCAT('module:product/view:product-detail/view_id:',product.id) LIMIT 1) slug
     FROM universe product LEFT JOIN idv_brand brand ON brand.id=product.brandId
     WHERE ${filters.sql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [component.categoryId, ...filters.values, input.limit, (page - 1) * input.limit],
  );

  const brandFilters = candidateConditions(input, appliedRelations, { excludeBrand: true });
  const priceFilters = candidateConditions(input, appliedRelations, { excludePrice: true });
  const attributeFilters = candidateConditions(input, appliedRelations, { facetAttributeAlias: "attribute" });
  const [[brandRows], [priceRows], [facetRows]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `${universeSql} SELECT product.brandId id,COALESCE(brand.name,'') name,COUNT(*) total
       FROM universe product LEFT JOIN idv_brand brand ON brand.id=product.brandId
       WHERE product.brandId>0 AND ${brandFilters.sql} GROUP BY product.brandId,brand.name ORDER BY total DESC,brand.name`,
      [component.categoryId, ...brandFilters.values],
    ),
    pool.query<RowDataPacket[]>(
      `${universeSql} SELECT
        SUM(product.price<1000000) under_1m,
        SUM(product.price>=1000000 AND product.price<3000000) from_1m_3m,
        SUM(product.price>=3000000 AND product.price<5000000) from_3m_5m,
        SUM(product.price>=5000000 AND product.price<10000000) from_5m_10m,
        SUM(product.price>=10000000) over_10m
       FROM universe product WHERE ${priceFilters.sql}`,
      [component.categoryId, ...priceFilters.values],
    ),
    pool.query<RowDataPacket[]>(
      `${universeSql} SELECT attribute.id attribute_id,attribute.attribute_code,attribute.name attribute_name,
        value.id value_id,value.value value_label,COUNT(DISTINCT product.id) total
       FROM universe product
       JOIN idv_product_attribute pa ON pa.pro_id=product.id
       JOIN idv_attribute attribute ON attribute.id=pa.attr_id AND attribute.status=1 AND attribute.isSearch=1
       JOIN idv_attribute_value value ON value.id=pa.attr_value_id AND value.attributeId=attribute.id
       WHERE ${attributeFilters.sql}
       GROUP BY attribute.id,attribute.attribute_code,attribute.name,value.id,value.value
       ORDER BY attribute.name,value.value LIMIT 1000`,
      [component.categoryId, ...attributeFilters.values],
    ),
  ]);
  const groupedAttributes = new Map<number, { id: number; code: string; name: string; values: Array<{ id: number; label: string; count: number }> }>();
  for (const row of facetRows) {
    const id = Number(row.attribute_id);
    if (!groupedAttributes.has(id))
      groupedAttributes.set(id, { id, code: String(row.attribute_code), name: String(row.attribute_name), values: [] });
    groupedAttributes.get(id)!.values.push({ id: Number(row.value_id), label: String(row.value_label), count: Number(row.total) });
  }
  const bucketCounts = priceRows[0] || {};
  return {
    items: rows.map((row) => ({
      productId: Number(row.id),
      name: String(row.proName),
      sku: String(row.storeSKU || ""),
      warranty: String(row.warranty || ""),
      thumbnail: resolveProductImageUrl(row.proThum, ""),
      brandId: Number(row.brandId || 0),
      brandName: String(row.brandName || ""),
      price: Number(row.price),
      marketPrice: Number(row.market_price || 0),
      slug: String(row.slug || "").replace(/^\/+/, ""),
      compatible: true,
      selected: normalizedSelections.some((item) => item.componentCode === input.componentCode && item.productId === Number(row.id)),
      reasons: [] as PcBuilderDiagnostic[],
    })),
    facets: {
      prices: [
        { key: "under_1m", label: "Dưới 1 triệu", min: 0, max: 999_999, count: Number(bucketCounts.under_1m || 0) },
        { key: "1m_3m", label: "1 - 3 triệu", min: 1_000_000, max: 2_999_999, count: Number(bucketCounts.from_1m_3m || 0) },
        { key: "3m_5m", label: "3 - 5 triệu", min: 3_000_000, max: 4_999_999, count: Number(bucketCounts.from_3m_5m || 0) },
        { key: "5m_10m", label: "5 - 10 triệu", min: 5_000_000, max: 9_999_999, count: Number(bucketCounts.from_5m_10m || 0) },
        { key: "over_10m", label: "Trên 10 triệu", min: 10_000_000, max: null, count: Number(bucketCounts.over_10m || 0) },
      ],
      brands: brandRows.map((row) => ({ id: Number(row.id), name: String(row.name), count: Number(row.total) })),
      attributes: [...groupedAttributes.values()].slice(0, 16),
    },
    pagination: { page, limit: input.limit, total, totalPages },
    context: {
      constrained: appliedRelations.length > 0,
      relations: appliedRelations.map((relation) => ({
        componentCode: relation.componentCode,
        relatedComponentCode: relation.relatedComponentCode,
        selectedComponentCode: relation.selectedComponentCode,
        attributeId: relation.attributeId,
        attributeCode: relation.attributeCode,
        attributeName: relation.attributeName,
      })),
    },
  };
}

export async function savePcBuild(
  input: { name: string; mode: "manual" | "auto"; selections: PcBuilderSelection[]; input: Record<string, unknown> },
  customerId: number | null,
) {
  const quote = await buildPcBuilderQuote(input.selections);
  if (!quote.compatible)
    throw new PublicRequestError(409, "INCOMPATIBLE_BUILD", "Cấu hình còn lỗi tương thích và chưa thể lưu.");
  const token = customerId ? null : randomBytes(32).toString("base64url");
  const tokenHash = token ? createHash("sha256").update(token).digest("hex") : null;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO web_admin_pc_builds
       (customer_id,name,mode,input_json,share_token_hash,expires_at,rule_revision,catalog_revision,fingerprint)
       VALUES (?,?,?,?,?,${customerId ? "NULL" : "DATE_ADD(NOW(),INTERVAL 90 DAY)"},?,?,?)`,
      [customerId, input.name, input.mode, JSON.stringify(input.input), tokenHash, quote.ruleRevision, quote.catalogRevision, quote.fingerprint],
    );
    const buildId = Number((result as { insertId?: number }).insertId || 0);
    await connection.query(
      "INSERT INTO web_admin_pc_build_items (build_id,component_code,product_id,quantity,ordering) VALUES ?",
      [input.selections.map((item, index) => [buildId, item.componentCode, item.productId, item.quantity, index])],
    );
    await connection.commit();
    return { id: buildId, shareToken: token, quote };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function loadBuildSelections(buildId: number) {
  const [items] = await pool.query<RowDataPacket[]>(
    "SELECT component_code,product_id,quantity FROM web_admin_pc_build_items WHERE build_id=? ORDER BY ordering,id",
    [buildId],
  );
  return items.map((item) => ({
    componentCode: String(item.component_code),
    productId: Number(item.product_id),
    quantity: Number(item.quantity),
  })) as PcBuilderSelection[];
}

export async function getSharedPcBuild(token: string) {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token))
    throw new PublicRequestError(404, "BUILD_NOT_FOUND", "Không tìm thấy cấu hình.");
  const hash = createHash("sha256").update(token).digest("hex");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id,name,mode,input_json,created_at FROM web_admin_pc_builds
     WHERE share_token_hash=? AND status='active' AND customer_id IS NULL AND expires_at>NOW() LIMIT 1`,
    [hash],
  );
  if (!rows[0]) throw new PublicRequestError(404, "BUILD_NOT_FOUND", "Cấu hình không tồn tại hoặc đã hết hạn.");
  const selections = await loadBuildSelections(Number(rows[0].id));
  return {
    id: Number(rows[0].id),
    name: String(rows[0].name),
    mode: rows[0].mode,
    input: rows[0].input_json,
    createdAt: rows[0].created_at,
    quote: await buildPcBuilderQuote(selections),
  };
}

type AutoInput = {
  budget: number;
  resolution: "1080p" | "1440p" | "4k";
  gameType: "esports" | "aaa" | "mixed";
  cpuBrandIds: number[];
  gpuBrandIds: number[];
};
export type PcBuilderAutoResult = never;

export async function buildAutomaticGamingPcs(_input: AutoInput): Promise<PcBuilderAutoResult> {
  throw new PublicRequestError(
    503,
    "PC_BUILDER_AUTO_DISABLED",
    "Gaming tự động đang tạm dừng trong giai đoạn catalog-live.",
  );
}

export async function listCustomerPcBuilds(customerId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT b.id,b.name,b.mode,b.rule_revision,b.catalog_revision,b.fingerprint,b.created_at,b.updated_at,
      COUNT(i.id) item_count FROM web_admin_pc_builds b
      LEFT JOIN web_admin_pc_build_items i ON i.build_id=b.id
      WHERE b.customer_id=? AND b.status='active'
      GROUP BY b.id ORDER BY b.updated_at DESC,b.id DESC LIMIT 100`,
    [customerId],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    mode: row.mode,
    itemCount: Number(row.item_count),
    ruleRevision: row.rule_revision,
    catalogRevision: row.catalog_revision,
    fingerprint: row.fingerprint,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getCustomerPcBuild(customerId: number, buildId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id,name,mode,input_json,created_at,updated_at FROM web_admin_pc_builds
     WHERE id=? AND customer_id=? AND status='active' LIMIT 1`,
    [buildId, customerId],
  );
  if (!rows[0]) throw new PublicRequestError(404, "BUILD_NOT_FOUND", "Không tìm thấy cấu hình.");
  return {
    id: buildId,
    name: rows[0].name,
    mode: rows[0].mode,
    input: rows[0].input_json,
    createdAt: rows[0].created_at,
    updatedAt: rows[0].updated_at,
    quote: await buildPcBuilderQuote(await loadBuildSelections(buildId)),
  };
}

export async function updateCustomerPcBuild(
  customerId: number,
  buildId: number,
  input: { name: string; mode: "manual" | "auto"; selections: PcBuilderSelection[]; input: Record<string, unknown> },
) {
  const quote = await buildPcBuilderQuote(input.selections);
  if (!quote.compatible)
    throw new PublicRequestError(409, "INCOMPATIBLE_BUILD", "Cấu hình còn lỗi tương thích và chưa thể lưu.");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM web_admin_pc_builds WHERE id=? AND customer_id=? AND status='active' FOR UPDATE",
      [buildId, customerId],
    );
    if (!rows[0]) throw new PublicRequestError(404, "BUILD_NOT_FOUND", "Không tìm thấy cấu hình.");
    await connection.query(
      `UPDATE web_admin_pc_builds SET name=?,mode=?,input_json=?,rule_revision=?,catalog_revision=?,fingerprint=? WHERE id=?`,
      [input.name, input.mode, JSON.stringify(input.input), quote.ruleRevision, quote.catalogRevision, quote.fingerprint, buildId],
    );
    await connection.query("DELETE FROM web_admin_pc_build_items WHERE build_id=?", [buildId]);
    await connection.query(
      "INSERT INTO web_admin_pc_build_items (build_id,component_code,product_id,quantity,ordering) VALUES ?",
      [input.selections.map((item, index) => [buildId, item.componentCode, item.productId, item.quantity, index])],
    );
    await connection.commit();
    return { id: buildId, quote };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteCustomerPcBuild(customerId: number, buildId: number) {
  const [result] = await pool.query(
    "UPDATE web_admin_pc_builds SET status='deleted',share_token_hash=NULL WHERE id=? AND customer_id=? AND status='active'",
    [buildId, customerId],
  );
  if (Number((result as { affectedRows?: number }).affectedRows || 0) !== 1)
    throw new PublicRequestError(404, "BUILD_NOT_FOUND", "Không tìm thấy cấu hình.");
  return { success: true };
}
