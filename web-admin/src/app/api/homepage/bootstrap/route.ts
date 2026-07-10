import { NextResponse } from 'next/server';
import { getPublishedHeaderMenu, getPublishedHomepageMenu } from '@/lib/admin/menus';
import { getPublicBannersByScope } from '@/lib/admin/banners';
import { getHomepageCategoryFeatureSections } from '@/lib/categoryFeatureBoxes';
import { loadHomepageProductSections } from '@/app/api/categories/homepage-product-sections/route';
import { withPublicProductResponseCache } from '@/lib/publicProductCache';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
};

export async function GET() {
  try {
    const data = await withPublicProductResponseCache('homepage:bootstrap:v1', async () => {
      const [headerMenu, homepageMenu, banners, productSections, featureSections] = await Promise.all([
        getPublishedHeaderMenu(),
        getPublishedHomepageMenu(),
        getPublicBannersByScope('homepage'),
        loadHomepageProductSections([178, 137, 1087], 8),
        getHomepageCategoryFeatureSections(3, 9),
      ]);
      return { headerMenu, homepageMenu, banners, productSections, featureSections };
    });
    return NextResponse.json({ success: true, data }, { headers });
  } catch (error) {
    console.error('Failed to load homepage bootstrap:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers });
  }
}
