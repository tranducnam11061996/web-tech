import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { groupProductImages, listProductImagesReadOnly } from '@/lib/admin/images';
import { getPublicCategoryFeatureBox } from '@/lib/categoryFeatureBoxes';
import { withPublicProductResponseCache } from '@/lib/publicProductCache';
import { getCategoryTrail, getProductCategoryTrail } from '@/lib/publicBreadcrumbs';
import { getRelatedPosts, getSimilarProducts } from '@/lib/publicRecommendations';
import { getPublicBuyingGuide } from '@/lib/buyingGuides';
import { getPublicComboSetSummaries } from '@/lib/comboSets';
import { getPublicProductVouchers } from '@/lib/vouchers';
import { getPublicProductGroup } from '@/lib/productGroups';
import { getPublicProductPromotions } from '@/lib/productPromotions';
import { getPublicProductVideos, hasDisplayableSpecifications } from '@/lib/productVideos';

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
    const [featureBox, categoryTrail, buyingGuide] = await Promise.all([
      getPublicCategoryFeatureBox(entityId, 'category'),
      getCategoryTrail('product', entityId),
      getPublicBuyingGuide('product_category', entityId).catch((error) => {
        console.error('[Buying guide] Failed to load category guide:', error);
        return null;
      }),
    ]);
    return {
      success: true,
      type: 'category',
      data: {
        id: entityId, type: 'category', name: category.name || 'Danh muc', summary: category.summary || '',
        imgBig: category.img_big || '', metaTitle: category.meta_title || '', staticHtml: category.static_html || '',
        featureBox, categoryTrail, buyingGuide,
      },
    };
  }
  if (url.url_type !== 'product:product-detail') return { success: false, message: 'Invalid URL type', status: 400 };

  const [productRows] = await pool.query<any[]>(`
    SELECT p.id, p.proName, p.storeSKU, p.warranty, p.image_collection, p.proSummary, p.product_cat,
      pr.price, pr.market_price, pr.isOn, b.name AS brandName, i.video_code, i.spec, i.description
    FROM idv_sell_product_store p
    LEFT JOIN idv_sell_product_price pr ON p.id = pr.id
    LEFT JOIN idv_brand b ON p.brandId = b.id
    LEFT JOIN idv_sell_product_info i ON p.id = i.id
    WHERE p.id = ? LIMIT 1
  `, [entityId]);
  const product = productRows[0];
  if (!product) return { success: false, message: 'Product not found', status: 404 };
  const videos = getPublicProductVideos(product.video_code);
  const hasSpecifications = hasDisplayableSpecifications(product.spec);

  const [productImages, categoryTrail, relatedPosts, buyingGuide, comboSets, vouchers, productGroup, productPromotions] = await Promise.all([
    listProductImagesReadOnly(Number(product.id), product.image_collection || ''),
    getProductCategoryTrail(Number(product.id), product.product_cat),
    getRelatedPosts(String(product.proName || '')).catch((error) => {
      console.error('[Product recommendations] Failed to load related posts:', error);
      return [];
    }),
    getPublicBuyingGuide('product', Number(product.id)).catch((error) => {
      console.error('[Buying guide] Failed to load product guide:', error);
      return null;
    }),
    getPublicComboSetSummaries(Number(product.id)).catch((error) => {
      console.error('[Combo sets] Failed to load product combos:', error);
      return [];
    }),
    getPublicProductVouchers(Number(product.id)).catch((error) => {
      console.error('[Vouchers] Failed to load product vouchers:', error);
      return [];
    }),
    getPublicProductGroup(Number(product.id)).catch((error) => {
      console.error('[Product group] Failed to load product group:', error);
      return null;
    }),
    getPublicProductPromotions(Number(product.id)).catch((error) => {
      console.error('[Product promotions] Failed to load product promotions:', error);
      return [];
    }),
  ]);
  const similarProducts = await getSimilarProducts(Number(product.id), categoryTrail).catch((error) => {
    console.error('[Product recommendations] Failed to load similar products:', error);
    return [];
  });
  const imageGroups = groupProductImages(productImages);
  const images = productImages.map((image) => image.url).filter(Boolean);
  if (images.length === 0) images.push('https://placehold.co/800x800/1f2937/a1a1aa?text=No+Image');
  return {
    success: true,
    data: {
      id: product.id, slug, name: product.proName, sku: product.storeSKU, brand: product.brandName || 'Dang cap nhat',
      warranty: product.warranty || 'Dang cap nhat', price: product.price || 0, marketPrice: product.market_price || 0,
      savings: Math.max(0, Number(product.market_price || 0) - Number(product.price || 0)), images, imageItems: productImages,
      imageGroups, specs: product.spec || '', hasSpecifications, videos, description: product.description || '', proSummary: product.proSummary || '',
      status: product.isOn === 1 ? 'active' : 'inactive', type: 'product', categoryTrail,
      thumbnail: images[0], similarProducts, relatedPosts, buyingGuide, comboSets, vouchers, productGroup, productPromotions,
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
