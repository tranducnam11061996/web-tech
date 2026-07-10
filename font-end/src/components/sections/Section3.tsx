import { HeroBannerCarousel, type HeroBanner } from './HeroBannerCarousel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const PRIMARY_HERO_LOCATION = 'banner_slider_homepage_temp2019';
const FALLBACK_HERO_LOCATION = 'fake_slide_trang_chu';

const fallbackBanners: HeroBanner[] = [
  {
    id: 'fallback-mac',
    name: 'Mac',
    imageUrl: '',
    targetUrl: '#',
    renderMode: 'hybrid',
    text: {
      headline: 'Built for Apple Intelligence',
      subheading: 'Supercharged for productivity',
      ctaLabel: 'Buy now',
    },
    style: {
      backgroundColor: '474747',
      textColor: 'ffffff',
    },
  },
];

async function getHeroBanners(): Promise<HeroBanner[]> {
  try {
    const response = await fetch(`${API_URL}/api/banners/homepage`, { next: { revalidate: 60 } });
    if (!response.ok) return fallbackBanners;
    const payload = await response.json();
    if (!payload?.success || !Array.isArray(payload.data?.locations)) return fallbackBanners;

    const locations = payload.data.locations;
    const primary = locations.find((location: any) => location.key === PRIMARY_HERO_LOCATION);
    const fallback = locations.find((location: any) => location.key === FALLBACK_HERO_LOCATION);
    const banners = (primary?.banners?.length ? primary.banners : fallback?.banners) || [];
    return banners.length ? banners : fallbackBanners;
  } catch {
    return fallbackBanners;
  }
}

export default async function Section3({ initialBanners }: { initialBanners?: HeroBanner[] }) {
  const banners = initialBanners || await getHeroBanners();

  return (
    <>
      {/*  START section-3  */}
      <section className="section-3 hero-section" id="section-3">
        <HeroBannerCarousel banners={banners} />
      </section>
      {/*  END section-3  */}
    </>
  );
}
