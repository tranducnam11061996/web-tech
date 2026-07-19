import { createHash } from "crypto";
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import pool from "@/lib/db";
import { AdminApiError } from "@/lib/admin/common";
import { bumpPcBuilderCacheVersion } from "./infrastructure";

export type PcBuilderDb = Pool | PoolConnection;

export type PcBuilderComponentConfig = {
  code: string;
  name: string;
  categoryId: number | null;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  ordering: number;
  status: boolean;
};

export type PcBuilderAttributeRelation = {
  id: number;
  componentCode: string;
  relatedComponentCode: string;
  attributeId: number;
  attributeCode: string;
  attributeName: string;
  ordering: number;
  sourceProductCount: number;
  sourceAttributeProductCount: number;
  relatedProductCount: number;
  relatedAttributeProductCount: number;
  enforceable: boolean;
};

export const PC_BUILDER_RELATION_MIN_COVERAGE = 0.9;

type RelationCoverage = Pick<
  PcBuilderAttributeRelation,
  | "sourceProductCount"
  | "sourceAttributeProductCount"
  | "relatedProductCount"
  | "relatedAttributeProductCount"
>;

export function isPcBuilderRelationEnforceable(coverage: RelationCoverage) {
  if (coverage.sourceProductCount <= 0 || coverage.relatedProductCount <= 0)
    return false;
  return (
    coverage.sourceAttributeProductCount / coverage.sourceProductCount >=
      PC_BUILDER_RELATION_MIN_COVERAGE &&
    coverage.relatedAttributeProductCount / coverage.relatedProductCount >=
      PC_BUILDER_RELATION_MIN_COVERAGE
  );
}

const relationInputSchema = z
  .object({
    relatedComponentCode: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .regex(/^[a-z0-9_]+$/),
    attributeId: z.coerce.number().int().positive(),
    ordering: z.coerce.number().int().min(-100_000).max(100_000).default(0),
  })
  .strict();

export const pcBuilderComponentConfigurationSchema = z
  .object({
    version: z.string().regex(/^[a-f0-9]{64}$/i),
    components: z
      .array(
        z
          .object({
            code: z
              .string()
              .trim()
              .min(1)
              .max(32)
              .regex(/^[a-z0-9_]+$/)
              .optional(),
            categoryId: z.coerce.number().int().positive(),
            name: z.string().trim().min(1).max(100),
            required: z.boolean(),
            maxSelections: z.coerce.number().int().min(1).max(8),
            ordering: z.coerce.number().int().min(-100_000).max(100_000),
            status: z.boolean().default(true),
            relations: z.array(relationInputSchema).max(20).default([]),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();

export async function hasPcBuilderCatalogLive(db: PcBuilderDb = pool) {
  const [rows] = await db.query<
    RowDataPacket[]
  >(`SELECT COUNT(*) total FROM information_schema.tables
    WHERE table_schema=DATABASE() AND table_name IN ('web_admin_pc_builder_components','web_admin_pc_builder_component_relations')`);
  const [columns] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='web_admin_pc_builder_components'
      AND column_name='category_id'`);
  return Number(rows[0]?.total || 0) === 2 && Number(columns[0]?.total || 0) === 1;
}

export async function loadPcBuilderComponents(
  db: PcBuilderDb = pool,
  includeInactive = false,
) {
  const [rows] = await db.query<RowDataPacket[]>(`SELECT code,name,category_id,
    is_required,min_selections,max_selections,ordering,status
    FROM web_admin_pc_builder_components ${includeInactive ? "" : "WHERE status=1"} ORDER BY ordering,code`);
  return rows.map((row): PcBuilderComponentConfig => ({
    code: String(row.code),
    name: String(row.name),
    categoryId: row.category_id === null ? null : Number(row.category_id),
    required: Boolean(row.is_required),
    minSelections: Number(row.min_selections || 0),
    maxSelections: Number(row.max_selections || 1),
    ordering: Number(row.ordering || 0),
    status: Boolean(row.status),
  }));
}

export async function loadPcBuilderRelations(db: PcBuilderDb = pool) {
  const [rows] = await db.query<
    RowDataPacket[]
  >(`WITH RECURSIVE tree AS (
      SELECT code,category_id id FROM web_admin_pc_builder_components
      WHERE status=1 AND category_id IS NOT NULL
      UNION ALL
      SELECT tree.code,category.id FROM tree
      JOIN idv_seller_category category ON category.parentId=tree.id
      WHERE category.status=1
    ), products AS (
      SELECT DISTINCT tree.code,pc.pro_id FROM tree
      JOIN idv_product_category pc ON pc.category_id=tree.id
      JOIN idv_sell_product_price price ON price.id=pc.pro_id
        AND price.isOn=1 AND price.price>0
    ), totals AS (
      SELECT code,COUNT(*) product_count FROM products GROUP BY code
    ), attribute_totals AS (
      SELECT products.code,pa.attr_id,COUNT(DISTINCT products.pro_id) product_count
      FROM products JOIN idv_product_attribute pa ON pa.pro_id=products.pro_id
      GROUP BY products.code,pa.attr_id
    )
    SELECT r.id,r.component_code,r.related_component_code,r.attribute_id,
    a.attribute_code,a.name attribute_name,r.ordering,
    COALESCE(source_total.product_count,0) source_product_count,
    COALESCE(source_attribute.product_count,0) source_attribute_product_count,
    COALESCE(related_total.product_count,0) related_product_count,
    COALESCE(related_attribute.product_count,0) related_attribute_product_count
    FROM web_admin_pc_builder_component_relations r
    JOIN web_admin_pc_builder_components source ON source.code=r.component_code AND source.status=1
    JOIN web_admin_pc_builder_components related ON related.code=r.related_component_code AND related.status=1
    JOIN idv_attribute a ON a.id=r.attribute_id AND a.status=1
    LEFT JOIN totals source_total ON source_total.code=r.component_code
    LEFT JOIN attribute_totals source_attribute
      ON source_attribute.code=r.component_code AND source_attribute.attr_id=r.attribute_id
    LEFT JOIN totals related_total ON related_total.code=r.related_component_code
    LEFT JOIN attribute_totals related_attribute
      ON related_attribute.code=r.related_component_code AND related_attribute.attr_id=r.attribute_id
    WHERE r.status=1 ORDER BY r.ordering,r.id`);
  return rows.map((row): PcBuilderAttributeRelation => {
    const coverage = {
      sourceProductCount: Number(row.source_product_count || 0),
      sourceAttributeProductCount: Number(
        row.source_attribute_product_count || 0,
      ),
      relatedProductCount: Number(row.related_product_count || 0),
      relatedAttributeProductCount: Number(
        row.related_attribute_product_count || 0,
      ),
    };
    return {
      id: Number(row.id),
      componentCode: String(row.component_code),
      relatedComponentCode: String(row.related_component_code),
      attributeId: Number(row.attribute_id),
      attributeCode: String(row.attribute_code),
      attributeName: String(row.attribute_name),
      ordering: Number(row.ordering || 0),
      ...coverage,
      enforceable: isPcBuilderRelationEnforceable(coverage),
    };
  });
}

export function buildPcBuilderConfigurationVersion(
  components: PcBuilderComponentConfig[],
  relations: PcBuilderAttributeRelation[],
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        components,
        relations,
        relationMinimumCoverage: PC_BUILDER_RELATION_MIN_COVERAGE,
      }),
    )
    .digest("hex");
}

export async function loadEnabledCategoryScope(
  categoryId: number,
  db: PcBuilderDb = pool,
) {
  const [rows] = await db.query<RowDataPacket[]>(
    `WITH RECURSIVE tree AS (
      SELECT id FROM idv_seller_category WHERE id=? AND status=1
      UNION ALL SELECT c.id FROM idv_seller_category c JOIN tree t ON c.parentId=t.id WHERE c.status=1
    ) SELECT id FROM tree`,
    [categoryId],
  );
  return rows.map((row) => Number(row.id)).filter(Number.isSafeInteger);
}

export async function pcBuilderConfigurationVersion(db: PcBuilderDb = pool) {
  const [components, relations] = await Promise.all([
    loadPcBuilderComponents(db, true),
    loadPcBuilderRelations(db),
  ]);
  return buildPcBuilderConfigurationVersion(components, relations);
}

export async function getPcBuilderComponentConfiguration(
  db: PcBuilderDb = pool,
) {
  const [components, relations, version] = await Promise.all([
    loadPcBuilderComponents(db, true),
    loadPcBuilderRelations(db),
    pcBuilderConfigurationVersion(db),
  ]);
  const active = components.filter(
    (component) => component.status && component.categoryId,
  );
  const counts = new Map<
    string,
    { productCount: number; categoryName: string }
  >();
  if (active.length) {
    const [rows] = await db.query<RowDataPacket[]>(`WITH RECURSIVE tree AS (
        SELECT code,category_id id FROM web_admin_pc_builder_components WHERE status=1 AND category_id IS NOT NULL
        UNION ALL SELECT t.code,c.id FROM tree t JOIN idv_seller_category c ON c.parentId=t.id WHERE c.status=1
      ) SELECT component.code,category.name category_name,
        COUNT(DISTINCT CASE WHEN price.isOn=1 AND price.price>0 THEN pc.pro_id END) product_count
      FROM web_admin_pc_builder_components component
      JOIN idv_seller_category category ON category.id=component.category_id
      LEFT JOIN tree ON tree.code=component.code
      LEFT JOIN idv_product_category pc ON pc.category_id=tree.id
      LEFT JOIN idv_sell_product_price price ON price.id=pc.pro_id
      WHERE component.status=1 AND component.category_id IS NOT NULL
      GROUP BY component.code,category.name`);
    for (const row of rows)
      counts.set(String(row.code), {
        productCount: Number(row.product_count || 0),
        categoryName: String(row.category_name || ""),
      });
  }
  return {
    version,
    components: active.map((component) => ({
      ...component,
      categoryName: counts.get(component.code)?.categoryName || "",
      productCount: counts.get(component.code)?.productCount || 0,
      relations: relations.filter(
        (relation) => relation.componentCode === component.code,
      ),
    })),
  };
}

export async function searchPcBuilderCategoryOptions(query: string) {
  const term = String(query || "")
    .trim()
    .slice(0, 100);
  const numericId = /^\d+$/.test(term) ? Number(term) : 0;
  const values: unknown[] = [];
  let condition = "c.status=1";
  if (numericId) {
    condition += " AND c.id=?";
    values.push(numericId);
  } else if (term) {
    condition += " AND c.name COLLATE utf8mb4_unicode_ci LIKE ?";
    values.push(`%${term}%`);
  }
  const limit = term ? "LIMIT 100" : "";
  const [categories] = await pool.query<RowDataPacket[]>(
    `SELECT c.id,c.name,c.parentId,c.ordering FROM idv_seller_category c
    WHERE ${condition}
    ORDER BY c.parentId,c.ordering DESC,c.name,c.id ${limit}`,
    values,
  );
  const ids = categories.map((row) => Number(row.id));
  if (!ids.length) return [];
  const [counts] = await pool.query<RowDataPacket[]>(
    `WITH RECURSIVE tree AS (
      SELECT id root_id,id FROM idv_seller_category WHERE id IN (?) AND status=1
      UNION ALL SELECT t.root_id,c.id FROM tree t JOIN idv_seller_category c ON c.parentId=t.id WHERE c.status=1
    ) SELECT root_id,COUNT(DISTINCT CASE WHEN price.isOn=1 AND price.price>0 THEN pc.pro_id END) product_count
    FROM tree LEFT JOIN idv_product_category pc ON pc.category_id=tree.id
    LEFT JOIN idv_sell_product_price price ON price.id=pc.pro_id GROUP BY root_id`,
    [ids],
  );
  const countById = new Map(
    counts.map((row) => [Number(row.root_id), Number(row.product_count || 0)]),
  );
  return categories.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    parentId: Number(row.parentId || 0),
    ordering: Number(row.ordering || 0),
    productCount: countById.get(Number(row.id)) || 0,
  }));
}

export async function getPcBuilderRelationAttributeOptions(
  sourceCategoryId: number,
  relatedCategoryId: number,
) {
  const [sourceScope, relatedScope] = await Promise.all([
    loadEnabledCategoryScope(sourceCategoryId),
    loadEnabledCategoryScope(relatedCategoryId),
  ]);
  if (!sourceScope.length || !relatedScope.length) return [];
  const allScope = Array.from(new Set([...sourceScope, ...relatedScope]));
  const [[totalRow], [rows]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT
        COUNT(DISTINCT CASE WHEN pc.category_id IN (?) THEN pc.pro_id END) source_total,
        COUNT(DISTINCT CASE WHEN pc.category_id IN (?) THEN pc.pro_id END) related_total
      FROM idv_product_category pc
      JOIN idv_sell_product_price price ON price.id=pc.pro_id
        AND price.isOn=1 AND price.price>0
      WHERE pc.category_id IN (?)`,
      [sourceScope, relatedScope, allScope],
    ),
    pool.query<RowDataPacket[]>(
    `SELECT a.id,a.name,a.attribute_code,
    COUNT(DISTINCT CASE WHEN pc.category_id IN (?) THEN pa.pro_id END) source_products,
    COUNT(DISTINCT CASE WHEN pc.category_id IN (?) THEN pa.pro_id END) related_products
    FROM idv_attribute a JOIN idv_product_attribute pa ON pa.attr_id=a.id
    JOIN idv_product_category pc ON pc.pro_id=pa.pro_id
    JOIN idv_sell_product_price price ON price.id=pc.pro_id
      AND price.isOn=1 AND price.price>0
    WHERE a.status=1 AND pc.category_id IN (?)
    GROUP BY a.id,a.name,a.attribute_code
    HAVING source_products>0 AND related_products>0 ORDER BY a.name,a.id`,
    [sourceScope, relatedScope, allScope],
    ),
  ]);
  const sourceTotal = Number(totalRow[0]?.source_total || 0);
  const relatedTotal = Number(totalRow[0]?.related_total || 0);
  return rows.map((row) => {
    const coverage = {
      sourceProductCount: sourceTotal,
      sourceAttributeProductCount: Number(row.source_products || 0),
      relatedProductCount: relatedTotal,
      relatedAttributeProductCount: Number(row.related_products || 0),
    };
    return {
      id: Number(row.id),
      name: String(row.name),
      attributeCode: String(row.attribute_code),
      sourceProducts: coverage.sourceAttributeProductCount,
      relatedProducts: coverage.relatedAttributeProductCount,
      sourceTotal,
      relatedTotal,
      enforceable: isPcBuilderRelationEnforceable(coverage),
    };
  });
}

export async function savePcBuilderComponentConfiguration(
  input: z.infer<typeof pcBuilderComponentConfigurationSchema>,
) {
  const categoryIds = input.components.map((component) => component.categoryId);
  if (new Set(categoryIds).size !== categoryIds.length)
    throw new AdminApiError(
      409,
      "CONFLICT",
      "Mỗi danh mục chỉ được xuất hiện một lần trong Build PC.",
    );
  const [categoryRows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM idv_seller_category WHERE id IN (?) AND status=1",
    [categoryIds],
  );
  if (categoryRows.length !== categoryIds.length)
    throw new AdminApiError(
      409,
      "CONFLICT",
      "Có danh mục không tồn tại hoặc đang bị ẩn.",
    );

  const current = await loadPcBuilderComponents(pool, true);
  const currentByCode = new Map(
    current.map((component) => [component.code, component]),
  );
  const currentByCategory = new Map(
    current
      .filter((component) => component.categoryId)
      .map((component) => [component.categoryId!, component]),
  );
  const normalized = input.components.map((component) => {
    const existing = component.code
      ? currentByCode.get(component.code)
      : currentByCategory.get(component.categoryId);
    const code = existing?.code || `category_${component.categoryId}`;
    if (!/^[a-z0-9_]{1,32}$/.test(code))
      throw new AdminApiError(400, "BAD_REQUEST", "Mã component không hợp lệ.");
    return {
      ...component,
      code,
    };
  });
  if (
    new Set(normalized.map((component) => component.code)).size !==
    normalized.length
  )
    throw new AdminApiError(409, "CONFLICT", "Component bị trùng.");
  const activeCodes = new Set(normalized.map((component) => component.code));
  const relationAttributeIds: number[] = [];
  for (const component of normalized)
    for (const relation of component.relations) {
      if (
        relation.relatedComponentCode === component.code ||
        !activeCodes.has(relation.relatedComponentCode)
      ) {
        throw new AdminApiError(
          400,
          "BAD_REQUEST",
          "Danh mục liên quan không hợp lệ.",
        );
      }
      relationAttributeIds.push(relation.attributeId);
    }
  if (relationAttributeIds.length) {
    const [attributeRows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM idv_attribute WHERE id IN (?) AND status=1",
      [Array.from(new Set(relationAttributeIds))],
    );
    if (attributeRows.length !== new Set(relationAttributeIds).size)
      throw new AdminApiError(
        409,
        "CONFLICT",
        "Thuộc tính tham chiếu không còn hợp lệ.",
      );
  }

  const normalizedByCode = new Map(
    normalized.map((component) => [component.code, component]),
  );
  for (const component of normalized)
    for (const relation of component.relations) {
      const related = normalizedByCode.get(relation.relatedComponentCode);
      if (!related)
        throw new AdminApiError(
          400,
          "BAD_REQUEST",
          "Danh mục liên quan không hợp lệ.",
        );
      const available = await getPcBuilderRelationAttributeOptions(
        component.categoryId,
        related.categoryId,
      );
      if (
        !available.some((attribute) => attribute.id === relation.attributeId)
      ) {
        throw new AdminApiError(
          409,
          "CONFLICT",
          "Thuộc tính tham chiếu không có dữ liệu sản phẩm ở cả hai danh mục.",
        );
      }
    }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const lockedVersion = await pcBuilderConfigurationVersion(connection);
    if (lockedVersion !== input.version)
      throw new AdminApiError(
        409,
        "CONFLICT",
        "Cấu hình đã thay đổi. Hãy tải lại trước khi lưu.",
      );
    const codes = normalized.map((component) => component.code);
    await connection.query(
      "UPDATE web_admin_pc_builder_components SET status=0 WHERE status=1 AND code<>'storage' AND code NOT IN (?)",
      [codes],
    );
    for (const component of normalized) {
      await connection.query(
        `INSERT INTO web_admin_pc_builder_components
        (code,name,category_id,category_root_ids_json,is_required,min_selections,max_selections,ordering,status)
        VALUES (?,?,?,JSON_ARRAY(?),?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),category_id=VALUES(category_id),
        category_root_ids_json=VALUES(category_root_ids_json),is_required=VALUES(is_required),
        min_selections=VALUES(min_selections),max_selections=VALUES(max_selections),ordering=VALUES(ordering),status=VALUES(status)`,
        [
          component.code,
          component.name,
          component.categoryId,
          component.categoryId,
          component.required ? 1 : 0,
          component.required ? 1 : 0,
          component.maxSelections,
          component.ordering,
          component.status ? 1 : 0,
        ],
      );
    }
    await connection.query(
      "DELETE FROM web_admin_pc_builder_component_relations",
    );
    const relationKeys = new Set<string>();
    for (const component of normalized)
      for (const relation of component.relations) {
        const unordered = [component.code, relation.relatedComponentCode]
          .sort()
          .join(":");
        const key = `${unordered}:${relation.attributeId}`;
        if (relationKeys.has(key))
          throw new AdminApiError(
            409,
            "CONFLICT",
            "Quan hệ danh mục bị trùng hoặc khai báo hai chiều.",
          );
        relationKeys.add(key);
        await connection.query(
          `INSERT INTO web_admin_pc_builder_component_relations
        (component_code,related_component_code,attribute_id,ordering,status) VALUES (?,?,?,?,1)`,
          [
            component.code,
            relation.relatedComponentCode,
            relation.attributeId,
            relation.ordering,
          ],
        );
      }
    await bumpPcBuilderCacheVersion(connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return getPcBuilderComponentConfiguration();
}
