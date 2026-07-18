export type PcBuilderComponentCode = 'cpu' | 'mainboard' | 'ram' | 'storage' | 'case' | 'psu' | 'gpu' | 'monitor' | 'keyboard' | 'mouse' | 'headset' | 'cooler';
export type PcBuilderSelection = { componentCode: PcBuilderComponentCode; productId: number; quantity: number };
export type PcBuilderDiagnostic = { ruleCode: string; severity: 'error' | 'warning' | 'info'; message: string; componentCodes: PcBuilderComponentCode[] };
export type PcBuilderCandidate = { productId: number; name: string; sku: string; thumbnail: string; brandName: string; price: number; marketPrice: number; slug: string; compatible: boolean; reasons: PcBuilderDiagnostic[] };
export type PcBuilderQuote = {
  items: Array<PcBuilderCandidate & { componentCode: PcBuilderComponentCode; quantity: number; lineTotal: number; available: boolean }>;
  totals: { subtotal: number; assemblyFee: number; total: number; itemCount: number };
  diagnostics: PcBuilderDiagnostic[]; compatible: boolean; ruleRevision: string; profileRevision: string; fingerprint: string;
};

export const PC_BUILDER_DRAFT_KEY = 'hacom:pc-builder:draft:v1';

export function formatPcPrice(value: number) { return new Intl.NumberFormat('vi-VN').format(Math.max(0, Number(value) || 0)) + 'đ'; }

export async function pcBuilderApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) throw new Error(payload?.error?.message || 'Không thể xử lý yêu cầu PC Builder.');
  return payload.data as T;
}
