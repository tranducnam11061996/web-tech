export type StorefrontFieldErrors = Record<string, string>;

export class StorefrontApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = "REQUEST_FAILED",
    public fields: StorefrontFieldErrors = {},
    public requestId = "",
    public retryAfter = 0,
  ) {
    super(message);
    this.name = "StorefrontApiError";
  }
}

type ApiEnvelope = {
  success?: boolean;
  data?: unknown;
  error?: { message?: string; code?: string; fields?: StorefrontFieldErrors; requestId?: string; retryAfter?: number };
  requestId?: string;
};

export async function parseStorefrontResponse<T = unknown>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope;
  if (response.ok && payload.success) return payload.data as T;
  const requestId = String(payload.error?.requestId || payload.requestId || response.headers.get("x-request-id") || "");
  const retryAfter = Number(payload.error?.retryAfter || response.headers.get("retry-after") || 0);
  const fallback = response.status >= 500
    ? "Máy chủ tạm thời không thể xử lý yêu cầu. Vui lòng thử lại."
    : "Không thể xử lý yêu cầu.";
  throw new StorefrontApiError(payload.error?.message || fallback, response.status, payload.error?.code || "REQUEST_FAILED", payload.error?.fields || {}, requestId, retryAfter);
}

export async function storefrontFetch<T = unknown>(path: string, init?: RequestInit) {
  let response: Response;
  try {
    const hasBody = init?.body !== undefined && init?.body !== null;
    const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
    response = await fetch(path, {
      ...init,
      headers: { ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}), ...(init?.headers || {}) },
    });
  } catch {
    throw new StorefrontApiError("Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.");
  }
  return parseStorefrontResponse<T>(response);
}

export function apiErrorSummary(error: unknown) {
  if (!(error instanceof StorefrontApiError)) return error instanceof Error ? error.message : "Không thể xử lý yêu cầu.";
  if (error.code === "BOT_PROTECTION_UNAVAILABLE") return "Máy chủ hoặc dịch vụ chống bot tạm thời không khả dụng. Vui lòng thử lại.";
  if (error.code === "BOT_VERIFICATION_FAILED") return "Không thể xác minh chống bot. Vui lòng thử gửi lại biểu mẫu.";
  return error.requestId ? `${error.message} Mã hỗ trợ: ${error.requestId}` : error.message;
}
