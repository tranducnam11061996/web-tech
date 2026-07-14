import { HeaderMenuManager } from '@/components/menu/HeaderMenuManager';
import { getFooterMenuAdmin } from '@/lib/admin/footerMenus';

export const revalidate = 0;

export default async function FooterMenuPage() {
  const initialData = await getFooterMenuAdmin();
  return (
    <HeaderMenuManager
      initialData={initialData}
      allowedAreas={['zones']}
      title="Quản lý Footer Menu"
      sectionLabel="Bốn nhóm link footer"
      verifyEndpoint="/api/menu/footer"
      adminEndpoint="/api/admin/menus/footer"
      publishEndpoint="/api/admin/menus/footer/publish"
    />
  );
}
