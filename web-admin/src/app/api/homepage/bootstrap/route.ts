import { NextResponse } from 'next/server';
import { getPublishedMenuBundle } from '@/lib/publicMenus';
import { getPublicBannersByScope } from '@/lib/publicBanners';
import { getHomepageCategoryFeatureSections } from '@/lib/categoryFeatureBoxes';
import { loadHomepageProductSections } from '@/lib/homepageProductSections';
import { withPublicProductResponseCache } from '@/lib/publicProductCache';
import { jsonWithEtag } from '@/lib/httpCache';
import { recordRouteMetric } from '@/lib/runtimeMetrics';
import { getHomepageBrands } from '@/lib/publicBrands';
import {
  buildHomepageBootstrapCacheKey,
  loadHomepageFeaturedCollection,
  parseHomepageFeaturedCollectionRequest,
} from '@/lib/homepageFeaturedCollection';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
};

export async function GET(request: Request) {
  const startedAt = performance.now();
  const timings: string[] = [];
  const featuredCollectionRequest = parseHomepageFeaturedCollectionRequest(new URL(request.url).searchParams);
  const timed = async <T,>(name: string, loader: () => Promise<T>) => {
    const started = performance.now();
    const value = await loader();
    timings.push(`${name};dur=${(performance.now() - started).toFixed(1)}`);
    return value;
  };

  try {
    const data = await withPublicProductResponseCache(buildHomepageBootstrapCacheKey(featuredCollectionRequest), async () => {
      const [menus, banners, productSections, featureSections, brands, featuredCollection] = await Promise.all([
        timed('menu', getPublishedMenuBundle),
        timed('banners', () => getPublicBannersByScope('homepage')),
        timed('product_sections', () => loadHomepageProductSections([1087], 8)),
        timed('feature_sections', () => getHomepageCategoryFeatureSections(3, 9)),
        timed('brands', getHomepageBrands),
        timed('featured_collection', async () => {
          if (!featuredCollectionRequest) return null;
          try {
            return await loadHomepageFeaturedCollection(featuredCollectionRequest);
          } catch (error) {
            console.error('Failed to load homepage featured collection:', error);
            return null;
          }
        }),
      ]);
      return {
        headerMenu: menus.headerMenu,
        homepageMenu: menus.homepageMenu,
        banners,
        productSections,
        featureSections,
        brands,
        featuredCollection,
      };
    });
    timings.push(`bootstrap;dur=${(performance.now() - startedAt).toFixed(1)}`);
    recordRouteMetric('GET /api/homepage/bootstrap', performance.now() - startedAt, 200);
    return jsonWithEtag(request, { success: true, data }, { headers: { ...headers, 'Server-Timing': timings.join(', ') } });
  } catch (error) {
    console.error('Failed to load homepage bootstrap:', error);
    timings.push(`bootstrap;dur=${(performance.now() - startedAt).toFixed(1)}`);
    recordRouteMetric('GET /api/homepage/bootstrap', performance.now() - startedAt, 500);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers: { ...headers, 'Server-Timing': timings.join(', ') } });
  }
}
