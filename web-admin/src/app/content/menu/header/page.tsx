import { HeaderMenuManager } from '@/components/menu/HeaderMenuManager';
import { getHeaderMenuAdmin } from '@/lib/admin/menus';

export const revalidate = 0;

export default async function HeaderMenuPage() {
  const initialData = await getHeaderMenuAdmin();
  return (
    <HeaderMenuManager
      initialData={initialData}
      allowedAreas={['zones', 'faves', 'topNav', 'utilityLinks']}
      title="Quản lý menu header"
      sectionLabel="Khu vực header"
      verifyEndpoint="/api/menu/header"
    />
  );
}
