import { HeaderMenuManager } from '@/components/menu/HeaderMenuManager';
import { getHeaderMenuAdmin } from '@/lib/admin/menus';

export const revalidate = 0;

export default async function HeaderMenuPage() {
  const initialData = await getHeaderMenuAdmin();
  return <HeaderMenuManager initialData={initialData} />;
}
