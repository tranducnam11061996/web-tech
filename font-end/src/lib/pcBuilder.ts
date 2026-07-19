export type PcBuilderComponentCode = string;
export type PcBuilderSelection = {
  componentCode: PcBuilderComponentCode;
  productId: number;
  quantity: number;
};
export type PcBuilderDiagnostic = {
  ruleCode: string;
  severity: "error" | "warning" | "info";
  message: string;
  componentCodes: PcBuilderComponentCode[];
};
export type PcBuilderCandidate = {
  productId: number;
  name: string;
  sku: string;
  thumbnail: string;
  brandId: number;
  brandName: string;
  warranty: string;
  price: number;
  marketPrice: number;
  slug: string;
  compatible: boolean;
  selected: boolean;
  reasons: PcBuilderDiagnostic[];
};
export type PcBuilderQuote = {
  items: Array<
    PcBuilderCandidate & {
      componentCode: PcBuilderComponentCode;
      quantity: number;
      lineTotal: number;
      available: boolean;
    }
  >;
  totals: {
    subtotal: number;
    assemblyFee: number;
    total: number;
    itemCount: number;
  };
  diagnostics: PcBuilderDiagnostic[];
  compatible: boolean;
  requiresConfirmation: boolean;
  missingRequiredComponents: Array<{
    componentCode: string;
    name: string;
    minSelections: number;
    selectedCount: number;
  }>;
  ruleRevision: string;
  catalogRevision: string;
  fingerprint: string;
  warningSignature: string;
};

export const PC_BUILDER_DRAFT_KEY = "hacom:pc-builder:draft:v1";
export const PC_BUILDER_WARNING_CONFIRMATION_KEY =
  "hacom:pc-builder:warning-confirmation:v1";
export const PC_BUILDER_DRAFT_VERSION = 1;

const COMPONENT_CODE_PATTERN = /^[a-z0-9_]{1,32}$/;

export function parsePcBuilderDraft(raw: string | null) {
  try {
    const value = JSON.parse(raw || "{}");
    if (
      value?.version !== PC_BUILDER_DRAFT_VERSION ||
      !Array.isArray(value.selections)
    )
      return [];
    const selections: PcBuilderSelection[] = [];
    const productIds = new Set<number>();
    const selectionKeys = new Set<string>();
    for (const candidate of value.selections.slice(0, 24)) {
      const componentCode = String(candidate?.componentCode || "").trim();
      const productId = Number(candidate?.productId);
      const quantity = Number(candidate?.quantity);
      if (
        !COMPONENT_CODE_PATTERN.test(componentCode) ||
        !Number.isSafeInteger(productId) ||
        productId <= 0 ||
        quantity !== 1
      )
        continue;
      const key = `${componentCode}:${productId}`;
      if (selectionKeys.has(key) || productIds.has(productId)) continue;
      selectionKeys.add(key);
      productIds.add(productId);
      selections.push({ componentCode, productId, quantity: 1 });
    }
    return selections;
  } catch {
    return [];
  }
}

export function serializePcBuilderDraft(selections: PcBuilderSelection[]) {
  return JSON.stringify({
    version: PC_BUILDER_DRAFT_VERSION,
    selections,
    savedAt: new Date().toISOString(),
  });
}

export function pcBuilderSelectionSignature(
  selections: PcBuilderSelection[],
) {
  return [...selections]
    .sort(
      (left, right) =>
        left.componentCode.localeCompare(right.componentCode) ||
        left.productId - right.productId ||
        left.quantity - right.quantity,
    )
    .map(
      (selection) =>
        `${selection.componentCode}:${selection.productId}:${selection.quantity}`,
    )
    .join("|");
}

export function pcBuilderSelectionsFromQuote(quote: PcBuilderQuote) {
  return quote.items.map((item) => ({
    componentCode: item.componentCode,
    productId: item.productId,
    quantity: item.quantity,
  }));
}

export function formatPcPrice(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(value) || 0))}đ`;
}

export async function pcBuilderApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    const error = new Error(
      payload?.error?.message || "Không thể xử lý yêu cầu PC Builder.",
    ) as Error & { code?: string };
    error.code = payload?.error?.code;
    throw error;
  }
  return payload.data as T;
}
