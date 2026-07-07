'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, ExternalLink } from 'lucide-react';
import { TabBasic } from '@/components/products/edit/TabBasic';
import { TabDescription } from '@/components/products/edit/TabDescription';
import { TabCategory } from '@/components/products/edit/TabCategory';
import { TabAttributes } from '@/components/products/edit/TabAttributes';
import { TabImages, type TabImagesHandle } from '@/components/products/edit/TabImages';
import { TabCombo } from '@/components/products/edit/TabCombo';
import { TabServices } from '@/components/products/edit/TabServices';

const TABS = [
  { id: 'basic', label: 'Cơ bản' },
  { id: 'description', label: 'Mô tả' },
  { id: 'category', label: 'Danh mục' },
  { id: 'attributes', label: 'Thuộc tính' },
  { id: 'images', label: 'Ảnh sản phẩm' },
  { id: 'combo', label: 'Combo set' },
  { id: 'config', label: 'Cấu hình' },
  { id: 'services', label: 'Dịch vụ' },
];

function selectedCategoryIds(product: any) {
  if (Array.isArray(product?.categoryIds)) {
    return product.categoryIds.map((item: unknown) => Number(item)).filter((id: number) => id > 0);
  }

  return String(product?.product_cat || '')
    .split(',')
    .map((item) => Number(item))
    .filter((id) => id > 0);
}

export function EditProductClient({
  product,
  categories,
  attributesData,
  productImages,
  combosData,
}: {
  product: any;
  categories?: any[];
  attributesData?: any[];
  productImages?: any[];
  combosData?: any;
}) {
  const router = useRouter();
  const imagesRef = useRef<TabImagesHandle>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [form, setForm] = useState<Record<string, any>>({
    id: product?.id,
    name: product?.proName || '',
    sku: product?.storeSKU || '',
    brandId: product?.brandId || 0,
    price: product?.price || 0,
    marketPrice: product?.market_price || 0,
    status: product?.isOn ?? 1,
    ordering: product?.ordering || 0,
    slug: String(product?.slug || '').replace(/^\/+/, ''),
    videoCode: product?.video_code || '',
    summary: product?.proSummary || '',
    specialOffer: product?.specialOffer || '',
    spec: product?.spec || '',
    description: product?.description || '',
    categoryIds: selectedCategoryIds(product),
    attributeValueIds: [],
  });
  const [saving, setSaving] = useState(false);
  const [imagesBusy, setImagesBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const updateField = (field: string, value: any) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    let productSaved = false;
    try {
      const endpoint = form.id ? `/api/admin/products/${form.id}` : '/api/admin/products';
      const response = await fetch(endpoint, {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Khong the luu san pham');
      }
      productSaved = true;
      const hasImageChanges = imagesRef.current?.isDirty() === true;
      if (hasImageChanges) await imagesRef.current?.saveChanges();
      setMessage(hasImageChanges ? 'Đã lưu sản phẩm và thay đổi ảnh.' : (payload.message || 'Đã lưu sản phẩm.'));
      if (!form.id && payload.data?.id) {
        router.replace(`/product/edit?id=${payload.data.id}`);
      } else {
        router.refresh();
      }
    } catch (saveError: any) {
      setError(
        productSaved
          ? `Sản phẩm đã lưu nhưng ảnh chưa lưu: ${saveError.message || 'Không thể lưu ảnh.'}`
          : (saveError.message || 'Không thể lưu sản phẩm.'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-col flex-1 overflow-hidden relative z-10 bg-[#0a0a0f]">
        <div className="bg-blue-600 px-4 py-2 text-white font-bold text-sm truncate uppercase tracking-wide flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          {form.name || 'Sản phẩm mới'}
        </div>

        <div className="flex border-b border-gray-800 bg-gray-950/50 overflow-x-auto custom-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-bold tracking-wider uppercase whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-red-500 text-red-400 bg-red-500/5 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-transparent relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent"></div>
          {message && <div aria-live="polite" className="mb-3 px-3 py-2 border border-green-900 bg-green-950/30 text-green-300 text-xs font-bold">{message}</div>}
          {error && <div role="alert" className="mb-3 px-3 py-2 border border-red-900 bg-red-950/30 text-red-300 text-xs font-bold">{error}</div>}

          {activeTab === 'basic' && <TabBasic product={product} form={form} onChange={updateField} />}
          {activeTab === 'description' && <TabDescription product={product} />}
          {activeTab === 'category' && <TabCategory form={form} onChange={updateField} product={product} categories={categories} />}
          {activeTab === 'attributes' && <TabAttributes attributesData={attributesData} form={form} onChange={updateField} />}
          <div className={activeTab === 'images' ? 'block' : 'hidden'} aria-hidden={activeTab !== 'images'}>
            <TabImages ref={imagesRef} productId={product?.id} initialImages={productImages || []} onBusyChange={setImagesBusy} />
          </div>
          {activeTab === 'combo' && <TabCombo combosData={combosData} />}
          {activeTab === 'config' && <div className="text-gray-400 p-10 text-center font-mono">Module cấu hình đang phát triển</div>}
          {activeTab === 'services' && <TabServices />}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-3 pr-3 pb-3">
        <button className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-blue-400 bg-blue-950/20 border border-blue-900 rounded-sm hover:border-blue-500 hover:text-blue-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all uppercase tracking-wider">
          <ExternalLink className="w-4 h-4" /> Xem trên web
        </button>
        <button onClick={handleSave} disabled={saving || imagesBusy} aria-busy={saving} className="flex items-center gap-2 px-8 py-2.5 text-xs font-bold text-green-400 bg-green-950/20 border border-green-900 rounded-sm hover:border-green-500 hover:text-green-300 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all uppercase tracking-wider disabled:opacity-60">
          <Save className="w-4 h-4" aria-hidden="true" /> {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
        <button onClick={() => router.push('/product/product-list')} className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-red-400 bg-red-950/20 border border-red-900 rounded-sm hover:border-red-500 hover:text-red-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all uppercase tracking-wider">
          <X className="w-4 h-4" /> Đóng
        </button>
      </div>
    </div>
  );
}

