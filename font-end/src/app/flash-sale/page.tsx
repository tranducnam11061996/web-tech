import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { internalApiUrl } from '@/lib/apiUrl';
import FlashSaleExperience, { type FlashSalePayload } from './FlashSaleExperience';

export const metadata: Metadata = { title: 'Flash Sale | TrucTiepGAME', description: 'Săn giá sốc theo khung giờ với số lượng giới hạn tại TrucTiepGAME.' };

async function loadFlashSales(): Promise<FlashSalePayload> {
  try {
    const response = await fetch(internalApiUrl('/api/flash-sales'), { cache: 'no-store' });
    if (!response.ok) throw new Error('Flash Sale API unavailable');
    const json = await response.json();
    return json.success ? json.data : { enabled:false,serverNow:new Date().toISOString(),campaigns:[] };
  } catch { return { enabled:false,serverNow:new Date().toISOString(),campaigns:[] }; }
}

export default async function FlashSalePage(){
  const data=await loadFlashSales();
  return <div className="min-h-dvh bg-[#07070a]">
    <Header />
    <FlashSaleExperience initialData={data} />
    <Footer />
  </div>;
}
