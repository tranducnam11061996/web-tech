import { HeaderMenuManager } from '@/components/menu/HeaderMenuManager';
import { getBottomFooterMenuAdmin } from '@/lib/admin/bottomFooterMenus';

export const revalidate = 0;

export default async function BottomFooterMenuPage() {
  const initialData = await getBottomFooterMenuAdmin();
  return (
    <HeaderMenuManager
      initialData={initialData}
      allowedAreas={['zones']}
      title="Quản lý Bottom Footer"
      sectionLabel="Nhóm link Bottom Footer"
      editorProfile="bottom-footer"
      verifyEndpoint="/api/menu/bottom-footer"
      adminEndpoint="/api/admin/menus/bottom-footer"
      publishEndpoint="/api/admin/menus/bottom-footer/publish"
    />
  );
}
