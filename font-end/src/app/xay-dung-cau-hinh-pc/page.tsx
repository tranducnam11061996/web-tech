import { CommercePageFrame } from '@/components/commerce/CommercePageFrame';
import PcBuilderClient from './PcBuilderClient';

export const metadata = {
  title: 'Xây dựng cấu hình PC | TrucTiepGAME',
  description: 'Tự chọn linh kiện tương thích hoặc để hệ thống đề xuất cấu hình Gaming theo ngân sách.',
};

export default function PcBuilderPage() {
  return <CommercePageFrame><PcBuilderClient /></CommercePageFrame>;
}
