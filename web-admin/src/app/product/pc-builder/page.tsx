import PcBuilderAdminClient from './PcBuilderAdminClient';
import { getPcBuilderAdminDashboard } from '@/lib/pcBuilder/admin';

export const dynamic = 'force-dynamic';

export default async function PcBuilderAdminPage() {
  const data = await getPcBuilderAdminDashboard();
  return <PcBuilderAdminClient initialData={JSON.parse(JSON.stringify(data))} />;
}
