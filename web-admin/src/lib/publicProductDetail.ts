import { createHash } from 'crypto';
import pool from '@/lib/db';
import { groupProductImages, listProductImagesReadOnly } from '@/lib/admin/images';
import { getPublicCategoryFeatureBox } from '@/lib/categoryFeatureBoxes';
import { getCategoryTrail, getProductCategoryTrail } from '@/lib/publicBreadcrumbs';
import { getRelatedPosts, getSimilarProducts } from '@/lib/publicRecommendations';
import { getPublicBuyingGuide } from '@/lib/buyingGuides';
import { getPublicComboSetSummaries } from '@/lib/comboSets';
import { getPublicProductVouchers } from '@/lib/vouchers';
import { getPublicProductGroup } from '@/lib/productGroups';
import { getPublicProductPromotions } from '@/lib/productPromotions';
import { mergeProductPromotions, parseProductEditorPromotions } from '@/lib/productPromotionRichText';
import { getPublicProductVideos, hasDisplayableSpecifications } from '@/lib/productVideos';
import { canonicalPcmarketBrandId } from '@/lib/legacyImport/pcmarketProducts';
import { classifyPublicCatalogRoute } from '@/lib/publicCatalogRoute';

async function resolvePublicEntity(slug: string) {
  const requestPath = `/${slug}`;
  const requestPathIndex = createHash('md5').update(requestPath).digest('hex');
  const [urlRows] = await pool.query<any[]>(
    'SELECT id_path, url_type FROM idv_url WHERE request_path_index = ? AND request_path = ? LIMIT 1',
    [requestPathIndex, requestPath],
  );
  const url = urlRows[0];
  if (!url) return null;
  return classifyPublicCatalogRoute(url.id_path, url.url_type);
}

async function safely<T>(label: string, loader: () => Promise<T>, fallback: T) {
  try {
    return await loader();
  } catch (error) {
    console.error(`[Product detail] ${label}:`, error);
    return fallback;
  }
}

export async function loadProductCorePayload(slug: string) {
  const resolved = await resolvePublicEntity(slug);
  if (!resolved) return { success: false, message: 'Not found', status: 404 };

  if (resolved.type === 'category') {
    const [rows] = await pool.query<any[]>(
      `SELECT c.name,c.summary,c.img_big,c.meta_title,c.static_html,
              COALESCE(pv.view_count,c.visit,0) AS visit
       FROM idv_seller_category c
       LEFT JOIN web_admin_page_view_totals pv
         ON pv.entity_type='product_category' AND pv.entity_id=c.id
       WHERE c.id=? AND c.status=1 LIMIT 1`,
      [resolved.entityId],
    );
    const category = rows[0];
    if (!category) return { success: false, message: 'Category not found', status: 404 };
    const [featureBox, categoryTrail] = await Promise.all([
      getPublicCategoryFeatureBox(resolved.entityId, 'configured'),
      getCategoryTrail('product', resolved.entityId),
    ]);
    return {
      success: true,
      type: 'category',
      data: {
        id: resolved.entityId,
        type: 'category',
        name: category.name || 'Danh muc',
        summary: category.summary || '',
        imgBig: category.img_big || '',
        metaTitle: category.meta_title || '',
        staticHtml: category.static_html || '',
        visit: Number(category.visit || 0),
        featureBox,
        categoryTrail,
        supplementalAvailable: true,
      },
    };
  }

  const [productRows] = await pool.query<any[]>(`
    SELECT p.id, p.proName, p.storeSKU, p.warranty, p.image_collection, p.proSummary, p.specialOffer, p.product_cat,p.brandId,
      COALESCE(pv.view_count,p.visit,0) AS visit,
      pr.price, pr.market_price, pr.isOn, b.name AS brandName,b.brand_index AS brandIndex, i.video_code, i.spec, i.description
    FROM idv_sell_product_store p
    LEFT JOIN web_admin_page_view_totals pv ON pv.entity_type='product' AND pv.entity_id=p.id
    LEFT JOIN idv_sell_product_price pr ON p.id = pr.id
    LEFT JOIN idv_brand b ON p.brandId = b.id
    LEFT JOIN idv_sell_product_info i ON p.id = i.id
    WHERE p.id = ? LIMIT 1
  `, [resolved.entityId]);
  const product = productRows[0];
  if (!product) return { success: false, message: 'Product not found', status: 404 };

  const [productImages, categoryTrail, comboSets, vouchers, productGroup, managedProductPromotions] = await Promise.all([
    listProductImagesReadOnly(Number(product.id), product.image_collection || ''),
    getProductCategoryTrail(Number(product.id), product.product_cat),
    safely('combo sets failed', () => getPublicComboSetSummaries(Number(product.id)), []),
    safely('vouchers failed', () => getPublicProductVouchers(Number(product.id)), []),
    safely('product group failed', () => getPublicProductGroup(Number(product.id)), null),
    safely('product promotions failed', () => getPublicProductPromotions(Number(product.id)), []),
  ]);
  const productPromotions = mergeProductPromotions(
    managedProductPromotions,
    parseProductEditorPromotions(Number(product.id), product.specialOffer),
  );
  const imageGroups = groupProductImages(productImages);
  const images = productImages.map((image) => image.url).filter(Boolean);
  if (images.length === 0) images.push('https://placehold.co/800x800/1f2937/a1a1aa?text=No+Image');

  return {
    success: true,
    data: {
      id: product.id,
      slug,
      name: product.proName,
      sku: product.storeSKU,
      brand: product.brandName || 'Dang cap nhat',
      brandId: canonicalPcmarketBrandId(Number(product.brandId || 0)),
      brandSlug: String(product.brandIndex || '').trim(),
      warranty: product.warranty || 'Dang cap nhat',
      price: product.price || 0,
      marketPrice: product.market_price || 0,
      savings: Math.max(0, Number(product.market_price || 0) - Number(product.price || 0)),
      images,
      imageItems: productImages,
      imageGroups,
      specs: product.spec || '',
      hasSpecifications: hasDisplayableSpecifications(product.spec),
      videos: getPublicProductVideos(product.video_code),
      description: product.description || '',
      proSummary: product.proSummary || '',
      status: product.isOn === 1 ? 'active' : 'inactive',
      visit: Number(product.visit || 0),
      type: 'product',
      categoryTrail,
      thumbnail: images[0],
      comboSets,
      vouchers,
      productGroup,
      productPromotions,
      supplementalAvailable: true,
    },
  };
}

export async function loadProductSupplementalPayload(slug: string) {
  const resolved = await resolvePublicEntity(slug);
  if (!resolved) return { success: false, message: 'Not found', status: 404 };

  if (resolved.type === 'category') {
    const buyingGuide = await safely(
      'category buying guide failed',
      () => getPublicBuyingGuide('product_category', resolved.entityId),
      null,
    );
    return { success: true, data: { similarProducts: [], relatedPosts: [], buyingGuide } };
  }

  const [productRows] = await pool.query<any[]>(
    'SELECT id, proName, product_cat FROM idv_sell_product_store WHERE id = ? LIMIT 1',
    [resolved.entityId],
  );
  const product = productRows[0];
  if (!product) return { success: false, message: 'Product not found', status: 404 };
  const categoryTrail = await getProductCategoryTrail(Number(product.id), product.product_cat);
  const [similarProducts, relatedPosts, buyingGuide] = await Promise.all([
    safely('similar products failed', () => getSimilarProducts(Number(product.id), categoryTrail), []),
    safely('related posts failed', () => getRelatedPosts(String(product.proName || '')), []),
    safely('product buying guide failed', () => getPublicBuyingGuide('product', Number(product.id)), null),
  ]);
  return { success: true, data: { similarProducts, relatedPosts, buyingGuide } };
}

export async function loadFullProductPayload(slug: string) {
  const core = await loadProductCorePayload(slug);
  if (!core.success || !('data' in core)) return core;
  const coreData = core.data as Record<string, any>;
  const supplemental = coreData.type === 'category'
    ? {
        success: true as const,
        data: {
          similarProducts: [],
          relatedPosts: [],
          buyingGuide: await safely(
            'category buying guide failed',
            () => getPublicBuyingGuide('product_category', Number(coreData.id)),
            null,
          ),
        },
      }
    : {
        success: true as const,
        data: {
          ...(await Promise.all([
            safely('similar products failed', () => getSimilarProducts(Number(coreData.id), coreData.categoryTrail || []), []),
            safely('related posts failed', () => getRelatedPosts(String(coreData.name || '')), []),
            safely('product buying guide failed', () => getPublicBuyingGuide('product', Number(coreData.id)), null),
          ]).then(([similarProducts, relatedPosts, buyingGuide]) => ({ similarProducts, relatedPosts, buyingGuide }))),
        },
      };
  return {
    ...core,
    data: { ...core.data, ...supplemental.data },
  };
}
