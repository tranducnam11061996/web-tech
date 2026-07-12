"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type VietnamProvince = {
  code: string;
  name: string;
  divisionType: string;
};

export type VietnamWard = {
  code: string;
  provinceCode: string;
  name: string;
  divisionType: string;
};

export type VietnamLocationValue = {
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
};

type LocationItem = Pick<VietnamProvince, "code" | "name">;

const DEFAULT_TRIGGER_CLASS =
  "w-full rounded-lg border border-[#30303a] bg-[#0c0c11] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20";

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

async function fetchLocationItems<T>(path: string, signal: AbortSignal) {
  const response = await fetch(path, { signal, credentials: "same-origin" });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(
      payload?.error?.message || "Không thể tải dữ liệu địa giới.",
    );
  }
  return (payload.data?.items || []) as T[];
}

function SearchableLocationPicker({
  id,
  label,
  placeholder,
  items,
  value,
  onChange,
  disabled = false,
  loading = false,
  invalid = false,
  required = true,
  describedBy,
  triggerClassName = DEFAULT_TRIGGER_CLASS,
}: {
  id: string;
  label: string;
  placeholder: string;
  items: LocationItem[];
  value: string;
  onChange: (item: LocationItem) => void;
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
  required?: boolean;
  describedBy?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = items.find((item) => item.code === value);
  const filtered = useMemo(() => {
    const keyword = normalizeSearchText(query);
    if (!keyword) return items;
    return items.filter((item) =>
      normalizeSearchText(item.name).includes(keyword),
    );
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-label={label}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => {
          setOpen((visible) => !visible);
          setQuery("");
        }}
        className={`${triggerClassName} flex items-center justify-between gap-3 text-left ${!selected ? "text-slate-400" : ""} disabled:cursor-not-allowed disabled:opacity-55`}
      >
        <span className="truncate">
          {loading ? "Đang tải..." : selected?.name || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-cyan-400/35 bg-[#101827] shadow-[0_18px_45px_rgba(0,0,0,.45)]">
          <div className="border-b border-slate-700/80 p-2">
            <label className="sr-only" htmlFor={`${id}-search`}>
              Tìm {label.toLocaleLowerCase("vi-VN")}
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0c0c11] px-3 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20">
              <Search className="h-4 w-4 text-cyan-300" aria-hidden="true" />
              <input
                id={`${id}-search`}
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Nhập để tìm ${label.toLocaleLowerCase("vi-VN")}...`}
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>
          <div
            id={`${id}-options`}
            role="listbox"
            aria-label={`Danh sách ${label.toLocaleLowerCase("vi-VN")}`}
            className="max-h-64 overflow-y-auto py-1"
          >
            {filtered.length ? (
              filtered.map((item) => {
                const active = item.code === value;
                return (
                  <button
                    key={item.code}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(item);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-cyan-400/10 focus:bg-cyan-400/10 focus:outline-none ${active ? "bg-cyan-500/20 font-semibold text-cyan-100" : "text-slate-200"}`}
                  >
                    <span>{item.name}</span>
                    {active ? (
                      <Check
                        className="h-4 w-4 text-cyan-300"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <p
                className="px-3 py-5 text-center text-sm text-slate-400"
                role="status"
              >
                Không tìm thấy {label.toLocaleLowerCase("vi-VN")} phù hợp.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function VietnamLocationSelector({
  value,
  onChange,
  idPrefix = "vietnam-location",
  triggerClassName,
  error,
  disabled = false,
  required = true,
  className = "grid grid-cols-1 gap-4 md:grid-cols-2",
}: {
  value: VietnamLocationValue;
  onChange: (value: VietnamLocationValue) => void;
  idPrefix?: string;
  triggerClassName?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  const [provinces, setProvinces] = useState<VietnamProvince[]>([]);
  const [wards, setWards] = useState<VietnamWard[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(true);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setProvincesLoading(true);
    setLocationError("");
    void fetchLocationItems<VietnamProvince>(
      "/api/customer/locations/provinces",
      controller.signal,
    )
      .then(setProvinces)
      .catch((reason: unknown) => {
        if ((reason as { name?: string })?.name !== "AbortError") {
          setLocationError(
            reason instanceof Error
              ? reason.message
              : "Không thể tải danh sách tỉnh/thành phố.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setProvincesLoading(false);
      });
    return () => controller.abort();
  }, [retryKey]);

  useEffect(() => {
    if (!value.provinceCode) {
      setWards([]);
      setWardsLoading(false);
      return;
    }
    const controller = new AbortController();
    setWardsLoading(true);
    setLocationError("");
    void fetchLocationItems<VietnamWard>(
      `/api/customer/locations/wards?provinceCode=${encodeURIComponent(value.provinceCode)}`,
      controller.signal,
    )
      .then(setWards)
      .catch((reason: unknown) => {
        if ((reason as { name?: string })?.name !== "AbortError") {
          setLocationError(
            reason instanceof Error
              ? reason.message
              : "Không thể tải danh sách phường/xã/đặc khu.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setWardsLoading(false);
      });
    return () => controller.abort();
  }, [value.provinceCode, retryKey]);

  const errorId = `${idPrefix}-error`;
  const fieldError = error || locationError;

  return (
    <div className={className}>
      <div className="space-y-1.5">
        <span className="block text-sm font-medium">Tỉnh/Thành phố</span>
        <SearchableLocationPicker
          id={`${idPrefix}-province`}
          label="Tỉnh/thành phố"
          placeholder="Chọn tỉnh/thành phố"
          items={provinces}
          value={value.provinceCode}
          disabled={disabled || provincesLoading}
          loading={provincesLoading}
          invalid={Boolean(fieldError)}
          required={required}
          describedBy={fieldError ? errorId : undefined}
          triggerClassName={triggerClassName}
          onChange={(province) =>
            onChange({
              provinceCode: province.code,
              provinceName: province.name,
              wardCode: "",
              wardName: "",
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <span className="block text-sm font-medium">Phường/Xã/Đặc khu</span>
        <SearchableLocationPicker
          id={`${idPrefix}-ward`}
          label="Phường/xã/đặc khu"
          placeholder="Chọn phường/xã/đặc khu"
          items={wards}
          value={value.wardCode}
          disabled={disabled || !value.provinceCode || wardsLoading}
          loading={wardsLoading}
          invalid={Boolean(fieldError)}
          required={required}
          describedBy={fieldError ? errorId : undefined}
          triggerClassName={triggerClassName}
          onChange={(ward) =>
            onChange({
              ...value,
              wardCode: ward.code,
              wardName: ward.name,
            })
          }
        />
      </div>
      {fieldError ? (
        <div
          id={errorId}
          className="md:col-span-2 flex items-center gap-3 text-sm text-red-300"
          role="alert"
        >
          <span>{fieldError}</span>
          {locationError ? (
            <button
              type="button"
              onClick={() => setRetryKey((current) => current + 1)}
              className="shrink-0 rounded border border-red-800 px-2 py-1 font-semibold hover:bg-red-950/50"
            >
              Thử lại
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
