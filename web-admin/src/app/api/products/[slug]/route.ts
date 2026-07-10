import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { groupProductImages, listProductImagesReadOnly } from '@/lib/admin/images';
import { getPublicCategoryFeatureBox } from '@/lib/categoryFeatureBoxes';
import { withPublicProductResponseCache } from '@/lib/publicProductCache';

const publicCacheHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
};

async function loadProductPayload(slug: string) {
  const requestPath = `/${slug}`;
  const requestPathIndex = createHash('md5').update(requestPath).digest('hex');
  const [urlRows] = await pool.query<any[]>(
    'SELECT id_path, url_type FROM idv_url WHERE request_path_index = ? AND request_path = ? LIMIT 1',
    [requestPathIndex, requestPath],
  );
  const url = urlRows[0];
  if (!url) return { success: false, message: 'Not found', status: 404 };

  const match = String(url.id_path || '').match(/view_id:(\d+)/);
  const entityId = match ? Number(match[1]) : 0;
  if (!entityId) return { success: false, message: 'Invalid URL mapping', status: 400 };

  if (url.url_type === 'product:category') {
    const [rows] = await pool.query<any[]>(
      'SELECT name, summary, img_big, meta_title, static_html FROM idv_seller_category WHERE id = ? LIMIT 1',
      [entityId],
    );
    const category = rows[0] || {};
    const featureBox = await getPublicCategoryFeatureBox(entityId, 'category');
    return {
      success: true,
      type: 'category',
      data: {
        id: entityId, type: 'category', name: category.name || 'Danh muc', summary: category.summary || '',
        imgBig: category.img_big || '', metaTitle: category.meta_title || '', staticHtml: category.static_html || '', featureBox,
      },
    };
  }
  if (url.url_type !== 'product:product-detail') return { success: false, message: 'Invalid URL type', status: 400 };

  const [productRows] = await pool.query<any[]>(`
    SELECT p.id, p.proName, p.storeSKU, p.warranty, p.image_collection, p.proSummary,
      pr.price, pr.market_price, pr.isOn, b.name AS brandName, i.spec, i.description
    FROM idv_sell_product_store p
    LEFT JOIN idv_sell_product_price pr ON p.id = pr.id
    LEFT JOIN idv_brand b ON p.brandId = b.id
    LEFT JOIN idv_sell_product_info i ON p.id = i.id
    WHERE p.id = ? LIMIT 1
  `, [entityId]);
  const product = productRows[0];
  if (!product) return { success: false, message: 'Product not found', status: 404 };

  const productImages = await listProductImagesReadOnly(Number(product.id), product.image_collection || '');
  const imageGroups = groupProductImages(productImages);
  const images = productImages.map((image) => image.url).filter(Boolean);
  if (images.length === 0) images.push('https://placehold.co/800x800/1f2937/a1a1aa?text=No+Image');
  return {
    success: true,
    data: {
      id: product.id, name: product.proName, sku: product.storeSKU, brand: product.brandName || 'Dang cap nhat',
      warranty: product.warranty || 'Dang cap nhat', price: product.price || 0, marketPrice: product.market_price || 0,
      savings: Math.max(0, Number(product.market_price || 0) - Number(product.price || 0)), images, imageItems: productImages,
      imageGroups, specs: product.spec || '', description: product.description || '', proSummary: product.proSummary || '',
      status: product.isOn === 1 ? 'active' : 'inactive', type: 'product',
    },
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const payload = await withPublicProductResponseCache(`product-detail:${slug}`, () => loadProductPayload(slug));
    const status = 'status' in payload ? Number(payload.status || 200) : 200;
    const { status: _status, ...body } = payload as Record<string, unknown>;
    return NextResponse.json(body, { status, headers: publicCacheHeaders });
  } catch (error) {
    console.error('API /products/[slug] Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers: publicCacheHeaders });
  }
}
