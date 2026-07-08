'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Save, X } from 'lucide-react';
import { TabAttributes } from '@/components/products/edit/TabAttributes';
import { TabBasic } from '@/components/products/edit/TabBasic';
import { TabCombo } from '@/components/products/edit/TabCombo';
import { TabDescription } from '@/components/products/edit/TabDescription';
import { TabImages, type TabImagesHandle } from '@/components/products/edit/TabImages';

const TABS = [
  { id: 'basic', label: 'Cơ bản' },
  { id: 'description', label: 'Mô tả' },
  { id: 'attributes', label: 'Thuộc tính' },
  { id: 'images', label: 'Ảnh sản phẩm' },
  { id: 'combo', label: 'Khuyến Mãi' },
] as const;

type TabId = (typeof TABS)[number]['id'];
type PersistableTab = 'basic' | 'description' | 'attributes' | 'combo';

function normalizeIdArray(value: unknown, max = 500, sortIds = false) {
  const source = Array.isArray(value) ? value : String(value || '').split(',');
  const ids = Array.from(new Set(source.map((item) => Number(item)).filter((id) => Number.isInteger(id) && id > 0))).slice(0, max);
  return sortIds ? ids.sort((a, b) => a - b) : ids;
}

function selectedCategoryIds(product: any) {
  return normalizeIdArray(product?.product_cat, 100);
}

function selectedAttributeValueIds(attributesData?: any[]) {
  return normalizeIdArray(
    (attributesData || []).flatMap((attr) =>
      (attr.options || [])
        .filter((opt: any) => opt.checked)
        .map((opt: any) => opt.id),
    ),
    500,
    true,
  );
}

function normalizeProductUrl(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function text(value: unknown) {
  return String(value ?? '');
}

function intValue(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function getBasicPayload(form: Record<string, any>) {
  return {
    name: text(form.name).trim(),
    sku: text(form.sku).trim(),
    brandId: intValue(form.brandId),
    price: Math.max(0, Number(form.price || 0)),
    marketPrice: Math.max(0, Number(form.marketPrice || 0)),
    status: intValue(form.status) === 0 ? 0 : 1,
    ordering: intValue(form.ordering),
    url: normalizeProductUrl(text(form.url || form.name)),
    videoCode: text(form.videoCode),
    summary: text(form.summary),
    spec: text(form.spec),
    categoryIds: normalizeIdArray(form.categoryIds, 100),
  };
}

function getDescriptionPayload(form: Record<string, any>) {
  return {
    description: text(form.description),
    metaTitle: text(form.metaTitle),
    metaKeyword: text(form.metaKeyword),
    metaDescription: text(form.metaDescription),
  };
}

function getAttributesPayload(form: Record<string, any>) {
  return { attributeValueIds: normalizeIdArray(form.attributeValueIds, 500, true) };
}

function getComboPayload(form: Record<string, any>) {
  return { specialOffer: text(form.specialOffer) };
}

function getSectionPayload(tab: PersistableTab, form: Record<string, any>) {
  if (tab === 'basic') return getBasicPayload(form);
  if (tab === 'description') return getDescriptionPayload(form);
  if (tab === 'attributes') return getAttributesPayload(form);
  return getComboPayload(form);
}

function snapshot(payload: unknown) {
  return JSON.stringify(payload);
}

function isPersistableTab(tab: TabId): tab is PersistableTab {
  return tab === 'basic' || tab === 'description' || tab === 'attributes' || tab === 'combo';
}

export function EditProductClient({
  product,
  categories,
  brands,
  storefrontUrl,
  attributesData,
  productImages,
  productComboSets,
}: {
  product: any;
  categories?: any[];
  brands?: any[];
  storefrontUrl?: string;
  attributesData?: any[];
  productImages?: any[];
  productComboSets?: any[];
}) {
  const router = useRouter();
  const imagesRef = useRef<TabImagesHandle>(null);
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [form, setForm] = useState<Record<string, any>>({
    id: product?.id,
    name: product?.proName || '',
    sku: product?.storeSKU || '',
    brandId: product?.brandId || 0,
    price: product?.price || 0,
    marketPrice: product?.market_price || 0,
    status: product?.isOn ?? 1,
    ordering: product?.ordering || 0,
    url: String(product?.url || product?.routeUrl || product?.slug || '').replace(/^\/+/, ''),
    brandName: product?.brandName || '',
    videoCode: product?.video_code || '',
    summary: product?.proSummary || '',
    specialOffer: product?.specialOffer || '',
    spec: product?.spec || '',
    description: product?.description || '',
    metaTitle: product?.meta_title || '',
    metaKeyword: product?.meta_keyword || '',
    metaDescription: product?.meta_description || '',
    categoryIds: selectedCategoryIds(product),
    attributeValueIds: selectedAttributeValueIds(attributesData),
  });
  const [snapshots, setSnapshots] = useState<Record<PersistableTab, string>>({
    basic: snapshot(getBasicPayload(form)),
    description: snapshot(getDescriptionPayload(form)),
    attributes: snapshot(getAttributesPayload(form)),
    combo: snapshot(getComboPayload(form)),
  });
  const [saving, setSaving] = useState(false);
  const [imagesBusy, setImagesBusy] = useState(false);
  const [imagesDirty, setImagesDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [urlManuallyEdited, setUrlManuallyEdited] = useState(Boolean(product?.id));
  const activeTabLabel = TABS.find((tab) => tab.id === activeTab)?.label || activeTab;
  const productWebUrl = form.url
    ? `${String(storefrontUrl || 'http://localhost:3001').replace(/\/+$/, '')}/${String(form.url).replace(/^\/+/, '')}`
    : '';

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('returnFocus') !== 'product-list') return;

    [0, 100, 300].forEach((delay) => {
      window.setTimeout(() => window.opener?.focus(), delay);
    });
    url.searchParams.delete('returnFocus');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const activeTabDirty = useMemo(() => {
    if (activeTab === 'images') return imagesDirty;
    if (!isPersistableTab(activeTab)) return false;
    return snapshot(getSectionPayload(activeTab, form)) !== snapshots[activeTab];
  }, [activeTab, form, imagesDirty, snapshots]);

  const canSaveActiveTab =
    !saving &&
    !imagesBusy &&
    activeTabDirty &&
    (Boolean(form.id) || activeTab === 'basic') &&
    (activeTab === 'images' || isPersistableTab(activeTab));

  const saveTitle = !form.id && activeTab !== 'basic'
    ? 'Hãy tạo sản phẩm ở tab Cơ bản trước'
    : !activeTabDirty
        ? 'Không có thay đổi cần lưu'
        : undefined;

  const updateField = (field: string, value: any) => {
    if (field === 'url') setUrlManuallyEdited(true);
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'name' && !urlManuallyEdited && !current.id) {
        next.url = normalizeProductUrl(String(value));
      }
      return next;
    });
  };

  const saveNewProduct = async () => {
    const basicPayload = getBasicPayload(form);
    const response = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, ...basicPayload }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload?.error?.message || 'Không thể tạo sản phẩm');
    }
    const id = payload.data?.id;
    const slug = payload.data?.slug || basicPayload.url;
    const categoryIds = normalizeIdArray(payload.data?.categoryIds ?? basicPayload.categoryIds, 100);
    setForm((current) => ({ ...current, id, url: slug, categoryIds }));
    setSnapshots((current) => ({
      ...current,
      basic: snapshot({ ...basicPayload, url: slug, categoryIds }),
    }));
    if (id) router.replace(`/product/edit?id=${id}`);
    return payload.message || 'Đã tạo sản phẩm.';
  };

  const saveSection = async (tab: PersistableTab) => {
    const data = getSectionPayload(tab, form);
    const response = await fetch(`/api/admin/products/${form.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: tab, data }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload?.error?.message || `Không thể lưu tab ${activeTabLabel}.`);
    }

    if (tab === 'basic') {
      const slug = payload.data?.slug || (data as any).url;
      const categoryIds = normalizeIdArray(payload.data?.categoryIds ?? (data as any).categoryIds, 100);
      const savedData = { ...data, url: slug, categoryIds };
      setForm((current) => ({ ...current, url: slug, categoryIds }));
      setSnapshots((current) => ({ ...current, basic: snapshot(savedData) }));
    } else if (tab === 'attributes' && Array.isArray(payload.data?.attributeValueIds)) {
      const savedData = { attributeValueIds: normalizeIdArray(payload.data.attributeValueIds, 500, true) };
      setForm((current) => ({ ...current, attributeValueIds: savedData.attributeValueIds }));
      setSnapshots((current) => ({ ...current, attributes: snapshot(savedData) }));
    } else {
      setSnapshots((current) => ({ ...current, [tab]: snapshot(data) }));
    }

    return payload.message || `Đã lưu thay đổi tab ${activeTabLabel}.`;
  };

  const handleSave = async () => {
    if (!canSaveActiveTab) return;
    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (!form.id) {
        setMessage(await saveNewProduct());
      } else if (activeTab === 'images') {
        await imagesRef.current?.saveChanges();
        setImagesDirty(false);
        setMessage('Đã lưu thay đổi tab Ảnh sản phẩm.');
      } else if (isPersistableTab(activeTab)) {
        setMessage(await saveSection(activeTab));
      }
    } catch (saveError: any) {
      setError(saveError.message || `Không thể lưu tab ${activeTabLabel}.`);
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
              type="button"
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

          {activeTab === 'basic' && (
            <div style={{ padding: '2% 5%' }}>
              <TabBasic product={product} form={form} onChange={updateField} brands={brands} categories={categories} />
            </div>
          )}
          {activeTab === 'description' && <TabDescription product={product} form={form} onChange={updateField} />}
          {activeTab === 'attributes' && <TabAttributes attributesData={attributesData} form={form} onChange={updateField} />}
          <div className={activeTab === 'images' ? 'block' : 'hidden'} aria-hidden={activeTab !== 'images'}>
            <TabImages
              ref={imagesRef}
              productId={form.id}
              initialImages={productImages || []}
              onBusyChange={setImagesBusy}
              onDirtyChange={setImagesDirty}
            />
          </div>
          <div className={activeTab === 'combo' ? 'block' : 'hidden'} aria-hidden={activeTab !== 'combo'}>
            <TabCombo productId={form.id} form={form} onChange={updateField} initialComboSets={productComboSets || []} isActive={activeTab === 'combo'} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-3 pr-3 pb-3">
        {productWebUrl ? (
          <a href={productWebUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-blue-400 bg-blue-950/20 border border-blue-900 rounded-sm hover:border-blue-500 hover:text-blue-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all uppercase tracking-wider">
            <ExternalLink className="w-4 h-4" aria-hidden="true" /> Xem trên web
          </a>
        ) : (
          <button type="button" disabled className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-gray-600 bg-gray-950 border border-gray-800 rounded-sm uppercase tracking-wider cursor-not-allowed">
            <ExternalLink className="w-4 h-4" aria-hidden="true" /> Xem trên web
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSaveActiveTab}
          aria-busy={saving}
          title={saveTitle}
          className="flex items-center gap-2 px-8 py-2.5 text-xs font-bold text-green-400 bg-green-950/20 border border-green-900 rounded-sm hover:border-green-500 hover:text-green-300 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-green-900 disabled:hover:text-green-400 disabled:hover:shadow-none"
        >
          <Save className="w-4 h-4" aria-hidden="true" /> {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
        <button onClick={() => router.push('/product/product-list')} className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-red-400 bg-red-950/20 border border-red-900 rounded-sm hover:border-red-500 hover:text-red-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all uppercase tracking-wider">
          <X className="w-4 h-4" aria-hidden="true" /> Đóng
        </button>
      </div>
    </div>
  );
}
