import { FlashSaleEditor } from '@/components/flash-sales/FlashSaleEditor';
export default async function EditFlashSalePage({params}:{params:Promise<{id:string}>}){const {id}=await params;const campaignId=Number(id);return <div className="h-full w-full p-2"><FlashSaleEditor campaignId={Number.isInteger(campaignId)&&campaignId>0?campaignId:undefined} /></div>;}
