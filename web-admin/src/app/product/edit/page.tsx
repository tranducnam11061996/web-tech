import pool from '@/lib/db';
import { EditProductClient } from './EditProductClient';
import { listProductImages } from '@/lib/admin/images';

async function getProductById(id: string) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id, p.proName, p.storeSKU, p.proThum, p.proSummary, p.specialOffer, p.promotion, p.cond, p.product_cat, p.image_collection,
        pr.price, pr.market_price, pr.isOn, pr.ordering, 
        b.name as brandName, 
        i.video_code, i.spec, i.multipart_spec, i.description
      FROM idv_sell_product_store p 
      LEFT JOIN idv_sell_product_price pr ON p.id = pr.id 
      LEFT JOIN idv_brand b ON p.brandId = b.id 
      LEFT JOIN idv_sell_product_info i ON p.id = i.id 
      WHERE p.id = ?
    `, [Number(id)]);

    const products = rows as any[];
    if (products.length === 0) {
      return { product: null, parsedImages: [] as any[] };
    }
    const product = products[0];
    const [categoryRows] = await pool.query(
      'SELECT category_id FROM idv_product_category WHERE pro_id = ? ORDER BY ordering DESC, category_id ASC',
      [Number(id)]
    );
    product.categoryIds = (categoryRows as any[])
      .map((row: any) => Number(row.category_id))
      .filter((categoryId: number) => categoryId > 0);
    if (product.categoryIds.length === 0) {
      const productCatIds = String(product.product_cat || '')
        .split(',')
        .map((item) => Number(item))
        .filter((categoryId) => categoryId > 0);
      if (productCatIds.length > 0) {
        const placeholders = productCatIds.map(() => '?').join(',');
        const [validRows] = await pool.query(
          `SELECT id FROM idv_seller_category WHERE id IN (${placeholders})`,
          productCatIds
        );
        product.categoryIds = (validRows as any[]).map((row: any) => Number(row.id));
      }
    }

    const parsedImages = await listProductImages(Number(id), product.image_collection || '', product.proThum || '');

    // Remove raw field to avoid serializing large text to client
    delete product.image_collection;

    return { product, parsedImages };
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return { product: null, parsedImages: [] };
  }
}

async function getCategories() {
  try {
    const [rows] = await pool.query('SELECT id, parentId, name FROM idv_seller_category ORDER BY parentId ASC, ordering ASC, id ASC');
    return rows as any[];
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
}

async function getProductAttributes(productId: number, productCat: string) {
  try {
    const catIds = productCat.split(',').filter(Boolean).map(Number);
    if (catIds.length === 0) return [];

    // Get attributes for product's categories (deduplicated)
    const placeholders = catIds.map(() => '?').join(',');
    const [attrRows] = await pool.query(`
      SELECT DISTINCT a.id, a.name, a.attribute_code, a.isSearch, a.in_summary, a.ordering
      FROM idv_attribute_category ac
      JOIN idv_attribute a ON ac.attr_id = a.id
      WHERE ac.category_id IN (${placeholders})
      ORDER BY a.ordering ASC, a.id ASC
    `, catIds);
    const attributes = attrRows as any[];
    if (attributes.length === 0) return [];

    // Get all attribute values for these attributes
    const attrIds = attributes.map((a: any) => a.id);
    const attrPlaceholders = attrIds.map(() => '?').join(',');
    const [valRows] = await pool.query(`
      SELECT id, attributeId, value, ordering
      FROM idv_attribute_value
      WHERE attributeId IN (${attrPlaceholders})
      ORDER BY ordering ASC, id ASC
    `, attrIds);
    const values = valRows as any[];

    // Get product's selected attribute values
    const [proAttrRows] = await pool.query(
      'SELECT attr_id, attr_value_id FROM idv_product_attribute WHERE pro_id = ?',
      [productId]
    );
    const selectedSet = new Set((proAttrRows as any[]).map((r: any) => r.attr_value_id));

    // Group values by attribute
    const valMap = new Map<number, any[]>();
    values.forEach((v: any) => {
      if (!valMap.has(v.attributeId)) valMap.set(v.attributeId, []);
      valMap.get(v.attributeId)!.push({
        id: v.id,
        label: v.value,
        checked: selectedSet.has(v.id),
      });
    });

    return attributes.map((a: any) => ({
      id: a.id,
      title: a.name,
      code: a.attribute_code,
      isSearch: a.isSearch,
      inSummary: a.in_summary,
      options: valMap.get(a.id) || [],
    }));
  } catch (error) {
    console.error("Failed to fetch product attributes:", error);
    return [];
  }
}

async function getCombos(page: number, limit: number, search: string, status: string) {
  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (search) {
      whereClause += ' AND title LIKE ?';
      params.push(`%${search}%`);
    }
    
    if (status && status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status === 'active' ? 1 : 0);
    }
    
    const offset = (page - 1) * limit;
    
    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM combo_set ${whereClause}`, params);
    const total = (countRows as any[])[0]?.total || 0;
    
    const query = `
      SELECT id, title, status
      FROM combo_set
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;
    params.push(Number(limit), Number(offset));
    
    const [rows] = await pool.query(query, params);
    
    return {
      combos: rows as any[],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit) || 1,
        totalItems: total,
        pageSize: limit
      }
    };
  } catch (error) {
    console.error("Failed to fetch combos:", error);
    return { combos: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, pageSize: limit } };
  }
}


export default async function EditProductPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const id = searchParams?.id as string;
  
  const { product, parsedImages } = id
    ? await getProductById(id)
    : {
        product: {
          id: undefined,
          proName: '',
          storeSKU: '',
          brandId: 0,
          price: 0,
          market_price: 0,
          isOn: 1,
          ordering: 0,
          product_cat: '',
        },
        parsedImages: [] as any[],
      };

  if (id && !product) {
    return <div className="p-10 text-center text-red-500 font-bold">Không tìm thấy sản phẩm!</div>;
  }

  const page = parseInt(searchParams?.page as string) || 1;
  const limit = parseInt(searchParams?.limit as string) || 20;
  const search = (searchParams?.search as string) || '';
  const status = (searchParams?.status as string) || 'all';

  const [categories, attributesData, combosData] = await Promise.all([
    getCategories(),
    product.id ? getProductAttributes(product.id, product.product_cat || '') : Promise.resolve([]),
    getCombos(page, limit, search, status)
  ]);

  return <EditProductClient 
    product={product} 
    categories={categories} 
    attributesData={attributesData} 
    productImages={parsedImages} 
    combosData={combosData}
  />;
}
