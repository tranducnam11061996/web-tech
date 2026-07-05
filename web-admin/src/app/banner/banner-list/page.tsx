import { BannerListFilter } from '@/components/banner-list/BannerListFilter';
import { BannerListTable } from '@/components/banner-list/BannerListTable';

export default function BannerListPage() {
  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      <div className="flex flex-col flex-1 h-full min-h-0">
        <BannerListFilter />

        <div className="flex-1 min-h-0 mt-2">
          <BannerListTable />
        </div>
      </div>
    </div>
  );
}
