import { BannerManagerClient } from '@/components/banner-list/BannerManagerClient';

export default function BannerListPage() {
  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      <div className="flex flex-col flex-1 h-full min-h-0">
        <BannerManagerClient />
      </div>
    </div>
  );
}
