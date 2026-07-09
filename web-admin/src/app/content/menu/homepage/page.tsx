import { HeaderMenuManager } from '@/components/menu/HeaderMenuManager';
import { getHeaderMenuAdmin } from '@/lib/admin/menus';

export const revalidate = 0;

export default async function HomepageMenuPage() {
  const initialData = await getHeaderMenuAdmin();
  return (
    <HeaderMenuManager
      initialData={initialData}
      allowedAreas={['circleStory', 'shopByCategory']}
      title="Quản lý menu trang chủ"
      sectionLabel="Khu vực trang chủ"
      verifyEndpoint="/api/menu/homepage"
    />
  );
}
