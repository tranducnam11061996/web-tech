import pool from '@/lib/db';
import { EditProductClient } from './EditProductClient';
import { listProductImages } from '@/lib/admin/images';
import { listProductComboSets } from '@/lib/admin/services';

async function getProductById(id: string) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id, p.proName, p.storeSKU, p.brandId, p.url, p.proThum, p.proSummary, p.specialOffer, p.promotion, p.cond, p.product_cat, p.image_collection,
        p.meta_title, p.meta_keyword, p.meta_description,
        pr.price, pr.market_price, pr.isOn, pr.ordering, 
        b.name as brandName, u.request_path as routeUrl,
        i.video_code, i.spec, i.multipart_spec, i.description
      FROM idv_sell_product_store p 
      LEFT JOIN idv_sell_product_price pr ON p.id = pr.id 
      LEFT JOIN idv_brand b ON p.brandId = b.id 
      LEFT JOIN idv_sell_product_info i ON p.id = i.id 
      LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
      WHERE p.id = ?
    `, [Number(id)]);

    const products = rows as any[];
    if (products.length === 0) {
      return { product: null, parsedImages: [] as any[] };
    }
    const product = products[0];
    product.categoryIds = Array.from(
      new Set(
        String(product.product_cat || '')
          .split(',')
          .map((item) => Number(item.trim()))
          .filter((categoryId) => Number.isInteger(categoryId) && categoryId > 0),
      ),
    );

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

async function getBrands() {
  try {
    const [rows] = await pool.query('SELECT id, name FROM idv_brand ORDER BY name ASC, id ASC');
    return rows as any[];
  } catch (error) {
    console.error('Failed to fetch brands:', error);
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
      FROM idv_attribute a
      WHERE a.status = 1
        AND (a.scope = 1 OR EXISTS (
          SELECT 1 FROM idv_attribute_category ac
          WHERE ac.attr_id = a.id AND ac.category_id IN (${placeholders}) AND ac.status = 1
        ))
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
          meta_title: '',
          meta_keyword: '',
          meta_description: '',
        },
        parsedImages: [] as any[],
      };

  if (id && !product) {
    return <div className="p-10 text-center text-red-500 font-bold">Không tìm thấy sản phẩm!</div>;
  }

  const storefrontUrl = (process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3001').replace(/\/+$/, '');

  const [categories, brands, attributesData, productComboSets] = await Promise.all([
    getCategories(),
    getBrands(),
    product.id ? getProductAttributes(product.id, product.product_cat || '') : Promise.resolve([]),
    product.id ? listProductComboSets(product.id) : Promise.resolve([]),
  ]);

  return <EditProductClient 
    product={product} 
    categories={categories} 
    brands={brands}
    storefrontUrl={storefrontUrl}
    attributesData={attributesData} 
    productImages={parsedImages} 
    productComboSets={productComboSets}
  />;
}
