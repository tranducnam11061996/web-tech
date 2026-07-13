import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { getProductCardBadgesForProductIds } from '@/lib/productCardAttributes';
import { resolveProductImageUrl } from '@/lib/productImageUrl';
import { canonicalPcmarketBrandId } from '@/lib/legacyImport/pcmarketProducts';

export type PublicBrandSummary = {
  id: number;
  name: string;
  slug: string;
  image: string;
  productCount: number;
};

type BrandRow = RowDataPacket & {
  id: number;
  brand_index: string | null;
  name: string | null;
  summary: string | null;
  image: string | null;
  product: number;
  status: number;
  ordering: number;
  meta_title?: string | null;
  meta_keywords?: string | null;
  meta_description?: string | null;
  description?: string | null;
  enabled_products?: number;
};

function safeSlug(value: string) {
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9._-]{1,100}$/.test(slug) ? slug : '';
}

export async function getHomepageBrands(): Promise<PublicBrandSummary[]> {
  const [rows] = await pool.query<BrandRow[]>(`
    SELECT b.id,b.brand_index,b.name,b.image,b.ordering,
      COUNT(DISTINCT CASE WHEN pr.isOn=1 THEN p.id END) AS enabled_products
    FROM idv_brand b
    LEFT JOIN idv_sell_product_store p ON p.brandId=b.id
    LEFT JOIN idv_sell_product_price pr ON pr.id=p.id
    WHERE b.status=1
    GROUP BY b.id
    ORDER BY b.ordering ASC,b.name ASC,b.id ASC
  `);
  const grouped = new Map<number, { canonical?: BrandRow; rows: BrandRow[]; productCount: number }>();
  for (const row of rows) {
    const id = canonicalPcmarketBrandId(Number(row.id));
    const group = grouped.get(id) || { rows: [], productCount: 0 };
    group.rows.push(row);
    group.productCount += Number(row.enabled_products || 0);
    if (Number(row.id) === id) group.canonical = row;
    grouped.set(id, group);
  }
  return [...grouped.entries()].map(([id, group]) => {
    const row = group.canonical || group.rows[0];
    return {
      id,
      name: String(row.name || '').trim(),
      slug: safeSlug(String(row.brand_index || '')),
      image: resolveProductImageUrl(String(row.image || ''), ''),
      productCount: group.productCount,
      ordering: Number(row.ordering || 0),
    };
  }).filter((brand) => brand.name && brand.slug && brand.productCount > 0)
    .sort((left, right) => left.ordering - right.ordering || left.name.localeCompare(right.name, 'vi') || left.id - right.id)
    .map(({ ordering: _ordering, ...brand }) => brand);
}

export type BrandCatalogQuery = {
  page: number;
  limit: number;
  sort: 'newest' | 'price_asc' | 'price_desc';
  minPrice: number | null;
  maxPrice: number | null;
};

export async function loadPublicBrandCatalog(slugInput: string, query: BrandCatalogQuery) {
  const slug = safeSlug(slugInput);
  if (!slug) return { success: false as const, status: 404, message: 'Brand not found' };
  const [brandRows] = await pool.query<BrandRow[]>(`
    SELECT b.id,b.brand_index,b.name,b.summary,b.image,b.product,b.status,b.ordering,
      i.meta_title,i.meta_keywords,i.meta_description,i.description
    FROM idv_brand b
    LEFT JOIN idv_brand_info i ON i.id=b.id AND i.sellerId=0
    WHERE b.brand_index=? AND b.status=1
    ORDER BY b.id ASC
  `, [slug]);
  if (!brandRows.length) return { success: false as const, status: 404, message: 'Brand not found' };
  const canonicalId = Math.min(...brandRows.map((row) => canonicalPcmarketBrandId(Number(row.id))));
  const canonical = brandRows.find((row) => Number(row.id) === canonicalId) || brandRows[0];
  const brandIds = Array.from(new Set(brandRows.map((row) => Number(row.id))));
  const placeholders = brandIds.map(() => '?').join(',');
  const where = [`p.brandId IN (${placeholders})`, 'pr.isOn=1'];
  const values: unknown[] = [...brandIds];
  if (query.minPrice !== null) { where.push('pr.price>=?'); values.push(query.minPrice); }
  if (query.maxPrice !== null) { where.push('pr.price<=?'); values.push(query.maxPrice); }
  const orderBy = query.sort === 'price_asc'
    ? 'ORDER BY pr.price=0,pr.price ASC,p.id DESC'
    : query.sort === 'price_desc'
      ? 'ORDER BY pr.price=0,pr.price DESC,p.id DESC'
      : 'ORDER BY p.id DESC';
  const offset = (query.page - 1) * query.limit;
  const [countResult, productResult, boundsResult] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM idv_sell_product_store p JOIN idv_sell_product_price pr ON pr.id=p.id WHERE ${where.join(' AND ')}`, values),
    pool.query<RowDataPacket[]>(`
      SELECT p.id,p.storeSKU,p.proName,p.proThum,pr.price,pr.market_price,u.request_path,b.name AS brandName
      FROM idv_sell_product_store p
      JOIN idv_sell_product_price pr ON pr.id=p.id
      LEFT JOIN idv_url u ON u.id_path=CONCAT('module:product/view:product-detail/view_id:',p.id)
      LEFT JOIN idv_brand b ON b.id=p.brandId
      WHERE ${where.join(' AND ')} ${orderBy} LIMIT ? OFFSET ?
    `, [...values, query.limit, offset]),
    pool.query<RowDataPacket[]>(`
      SELECT COALESCE(MIN(pr.price),0) AS min_price,COALESCE(MAX(pr.price),0) AS max_price
      FROM idv_sell_product_store p JOIN idv_sell_product_price pr ON pr.id=p.id
      WHERE p.brandId IN (${placeholders}) AND pr.isOn=1
    `, brandIds),
  ]);
  const total = Number(countResult[0][0]?.total || 0);
  const productRows = productResult[0];
  const badges = await getProductCardBadgesForProductIds(productRows.map((row) => Number(row.id)));
  const products = productRows.map((row) => ({
    id: Number(row.id),
    sku: String(row.storeSKU || ''),
    name: String(row.proName || ''),
    slug: String(row.request_path || '').replace(/^\/+/, '') || `product-${row.id}`,
    thumbnail: resolveProductImageUrl(String(row.proThum || ''), 'https://placehold.co/600x450/151518/a1a1aa?text=No+Image'),
    price: Number(row.price || 0),
    marketPrice: Number(row.market_price || 0),
    brand: String(row.brandName || canonical.name || ''),
    cardBadges: badges.get(Number(row.id)) || [],
  }));
  const firstContent = (field: keyof BrandRow) => String(brandRows.find((row) => String(row[field] || '').trim())?.[field] || '').trim();
  return {
    success: true as const,
    status: 200,
    data: {
      brand: {
        id: canonicalId,
        name: String(canonical.name || '').trim(),
        slug,
        summary: firstContent('summary'),
        description: firstContent('description'),
        image: resolveProductImageUrl(firstContent('image'), ''),
        metaTitle: firstContent('meta_title'),
        metaKeywords: firstContent('meta_keywords'),
        metaDescription: firstContent('meta_description'),
        sourceIds: brandIds,
        totalProductCount: brandRows.reduce((sum, row) => sum + Number(row.product || 0), 0),
      },
      products,
      priceBounds: { min: Number(boundsResult[0][0]?.min_price || 0), max: Number(boundsResult[0][0]?.max_price || 0) },
      pagination: { total, page: query.page, limit: query.limit, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
    },
  };
}
