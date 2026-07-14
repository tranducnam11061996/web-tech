"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { StorefrontApiError } from "@/lib/storefrontApi";

export type CustomerAddress = {
  id: number;
  recipientName: string;
  phone: string;
  type: "home" | "office" | "other";
  address: string;
  provinceCode: string | null;
  provinceName: string;
  wardCode: string | null;
  provinceId: number | null;
  districtId: number | null;
  districtName: string;
  wardId: number | null;
  wardName: string;
  locationSchemaVersion: "legacy_3tier" | "2025_2tier";
  isDefault: boolean;
};

export type CustomerUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  gender: string;
  birthday: string | null;
  emailVerified: boolean;
  defaultAddress: CustomerAddress | null;
};

export class CustomerApiError extends StorefrontApiError {
  constructor(
    message: string,
    code = "REQUEST_FAILED",
    retryAfter = 0,
    status = 0,
    fields: Record<string, string> = {},
    requestId = "",
  ) {
    super(message, status, code, fields, requestId, retryAfter);
    this.name = "CustomerApiError";
  }
}

type CustomerContextValue = {
  user: CustomerUser | null;
  loading: boolean;
  reload: () => Promise<CustomerUser | null>;
  logout: () => Promise<void>;
};

const CustomerContext = createContext<CustomerContextValue | null>(null);

export async function customerFetch(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.success)
    throw new CustomerApiError(
      payload?.error?.message || "Không thể xử lý yêu cầu.",
      payload?.error?.code,
      Number(payload?.error?.retryAfter || response.headers.get("retry-after") || 0),
      response.status,
      payload?.error?.fields || {},
      String(payload?.requestId || payload?.error?.requestId || response.headers.get("x-request-id") || ""),
    );
  return payload.data;
}

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const data = await customerFetch("/api/customer/me");
      const next = data.user as CustomerUser;
      setUser(next);
      return next;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const logout = useCallback(async () => {
    try {
      await customerFetch("/api/customer/auth/logout", {
        method: "POST",
        body: "{}",
      });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, reload, logout }),
    [user, loading, reload, logout],
  );
  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomerSession() {
  const value = useContext(CustomerContext);
  if (!value)
    throw new Error(
      "useCustomerSession must be used within CustomerSessionProvider",
    );
  return value;
}
