"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  CircleDollarSign,
  ClipboardList,
  ChevronDown,
  Edit3,
  Home,
  MapPin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  CustomerApiError,
  customerFetch,
  type CustomerAddress,
  useCustomerSession,
} from "@/lib/customer";
import { VietnamLocationSelector } from "@/components/location/VietnamLocationSelector";
import { FieldError } from "@/components/forms/FieldError";
import { apiErrorSummary } from "@/lib/storefrontApi";
import { focusFirstInvalidField, validateAddress, validateBirthday, validateName, validatePassword, validatePasswordConfirmation, validateVietnamPhone, type FieldErrors } from "@/lib/storefrontValidation";
import { PasswordRequirements } from "./CustomerAuthShared";

const panel = "rounded-2xl border border-[#252532] bg-[#111116]";
const input =
  "mt-1 w-full rounded-lg border border-[#30303a] bg-[#0c0c11] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20";
const money = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(value || 0)}đ`;
const label = (status: number) =>
  ({
    1: "Chờ xử lý",
    2: "Đã xác nhận",
    3: "Hoàn tất",
    4: "Thất bại",
    5: "Đã hủy",
  })[status] || "Không xác định";

function Notice({ error, success }: { error: string; success: string }) {
  return (
    <div aria-live="polite">
      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {success}
        </p>
      ) : null}
    </div>
  );
}

export function CustomerProfilePage() {
  const { user, reload } = useCustomerSession();
  const [form, setForm] = useState({ name: "", gender: "", birthday: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [profileFields, setProfileFields] = useState<FieldErrors>({});
  const profileFormRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (user)
      setForm({
        name: user.name,
        gender: user.gender,
        birthday: user.birthday || "",
      });
  }, [user]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const errors: FieldErrors = { name: validateName(form.name), birthday: validateBirthday(form.birthday) };
    for (const field of Object.keys(errors)) if (!errors[field]) delete errors[field];
    setProfileFields(errors);
    if (Object.keys(errors).length) { setError("Vui lòng sửa các trường được đánh dấu bên dưới."); window.setTimeout(() => focusFirstInvalidField(profileFormRef.current, errors)); return; }
    setBusy(true);
    setError("");
    try {
      await customerFetch("/api/customer/me", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      await reload();
      setSuccess("Đã lưu thông tin tài khoản.");
    } catch (reason) {
      if (reason instanceof CustomerApiError) setProfileFields(reason.fields);
      setError(apiErrorSummary(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">
          Hồ sơ
        </p>
        <h1 className="mt-2 text-2xl font-black">Thông tin tài khoản</h1>
        <p className="mt-1 text-sm text-slate-400">
          Cập nhật thông tin để đặt hàng nhanh hơn.
        </p>
      </header>
      <form
        ref={profileFormRef}
        onSubmit={submit}
        noValidate
        className={`${panel} p-5 sm:p-7`}
        aria-busy={busy}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Họ và tên
            <input
              name="name"
              required
              value={form.name}
              onChange={(e) => { setForm((x) => ({ ...x, name: e.target.value })); setProfileFields((current) => { const next = { ...current }; delete next.name; return next; }); }}
              onBlur={() => setProfileFields((current) => ({ ...current, name: validateName(form.name) }))}
              aria-invalid={Boolean(profileFields.name) || undefined}
              aria-describedby={profileFields.name ? "profile-name-error" : undefined}
              className={input}
            />
            <FieldError id="profile-name-error" message={profileFields.name} />
          </label>
          <label className="text-sm font-medium">
            Số điện thoại
            <input
              disabled
              value={user?.phone || ""}
              className={`${input} cursor-not-allowed text-slate-400`}
            />
            <span className="mt-1 block text-xs text-slate-500">
              Số điện thoại đăng nhập không đổi trực tiếp.
            </span>
          </label>
          <label className="text-sm font-medium">
            Email
            <input
              disabled
              value={user?.email || ""}
              className={`${input} cursor-not-allowed text-slate-400`}
            />
            <span className="mt-1 block text-xs text-emerald-300">
              {user?.emailVerified ? "Email đã xác minh" : "Chưa xác minh"}
            </span>
          </label>
          <label className="text-sm font-medium">
            Giới tính
            <select
              name="gender"
              value={form.gender}
              onChange={(e) =>
                setForm((x) => ({ ...x, gender: e.target.value }))
              }
              className={input}
            >
              <option value="">Không muốn nêu</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Ngày sinh
            <input
              name="birthday"
              type="date"
              value={form.birthday}
              onChange={(e) =>
                { setForm((x) => ({ ...x, birthday: e.target.value })); setProfileFields((current) => { const next = { ...current }; delete next.birthday; return next; }); }
              }
              onBlur={() => setProfileFields((current) => ({ ...current, birthday: validateBirthday(form.birthday) }))}
              aria-invalid={Boolean(profileFields.birthday) || undefined}
              aria-describedby={profileFields.birthday ? "profile-birthday-error" : undefined}
              className={input}
            />
            <FieldError id="profile-birthday-error" message={profileFields.birthday} />
          </label>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            disabled={busy}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold hover:bg-blue-500 disabled:opacity-60"
          >
            {busy ? "Đang lưu..." : "Lưu thông tin"}
          </button>
        </div>
        <Notice error={error} success={success} />
      </form>
    </>
  );
}

type Province = { code: string; name: string; divisionType: string };
type Ward = {
  code: string;
  provinceCode: string;
  name: string;
  divisionType: string;
};

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
}

function LocationPicker({
  items,
  value,
  onChange,
  label,
  placeholder,
  emptyMessage,
  optionsId,
  disabled = false,
  describedBy,
}: {
  items: Array<{ code: string; name: string }>;
  value: string;
  onChange: (code: string) => void;
  label: string;
  placeholder: string;
  emptyMessage: string;
  optionsId: string;
  disabled?: boolean;
  describedBy?: string;
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
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative mt-1">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={optionsId}
        aria-label={label}
        aria-describedby={describedBy}
        aria-invalid={Boolean(describedBy) || undefined}
        disabled={disabled}
        onClick={() => {
          setOpen((visible) => !visible);
          setQuery("");
        }}
        className={`${input} mt-0 flex items-center justify-between gap-3 text-left ${!selected ? "text-slate-400" : ""} disabled:cursor-not-allowed disabled:opacity-55`}
      >
        <span className="truncate">{selected?.name || placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-cyan-400/35 bg-[#101827] shadow-[0_18px_45px_rgba(0,0,0,.45)]">
          <div className="border-b border-slate-700/80 p-2">
            <label className="sr-only" htmlFor={`${optionsId}-search`}>
              Tìm {label.toLocaleLowerCase("vi-VN")}
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0c0c11] px-3 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20">
              <Search className="h-4 w-4 text-cyan-300" aria-hidden="true" />
              <input
                id={`${optionsId}-search`}
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Nhập để tìm ${label.toLocaleLowerCase("vi-VN")}...`}
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>
          <div
            id={optionsId}
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
                      onChange(item.code);
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
                {emptyMessage}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const emptyAddress = {
  recipientName: "",
  phone: "",
  type: "home",
  address: "",
  provinceCode: "",
  wardCode: "",
  isDefault: false,
};

export function CustomerAddressPage() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [draft, setDraft] = useState<any>(emptyAddress);
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [addressFields, setAddressFields] = useState<FieldErrors>({});
  const addressFormRef = useRef<HTMLFormElement>(null);
  const load = async () => {
    const addressData = await customerFetch("/api/customer/addresses");
    setAddresses(addressData.items);
  };
  useEffect(() => {
    void load().catch((reason: any) => setError(reason.message));
  }, []);
  const start = (address?: CustomerAddress) => {
    setError("");
    setEditing(address || null);
    setDraft(
      address
        ? {
            recipientName: address.recipientName,
            phone: address.phone,
            type: address.type,
            address: address.address,
            provinceCode: address.provinceCode || "",
            wardCode: address.wardCode || "",
            isDefault: address.isDefault,
          }
        : emptyAddress,
    );
    setOpen(true);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const errors: FieldErrors = {
      recipientName: validateName(String(draft.recipientName || ""), "Họ tên người nhận"),
      phone: validateVietnamPhone(String(draft.phone || "")),
      provinceCode: draft.provinceCode ? "" : "Vui lòng chọn tỉnh/thành phố.",
      wardCode: draft.wardCode ? "" : "Vui lòng chọn phường/xã/đặc khu.",
      address: validateAddress(String(draft.address || "")),
    };
    for (const field of Object.keys(errors)) if (!errors[field]) delete errors[field];
    setAddressFields(errors);
    if (Object.keys(errors).length) {
      setError("Vui lòng sửa các trường được đánh dấu bên dưới.");
      window.setTimeout(() => focusFirstInvalidField(addressFormRef.current, errors));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const path = editing
        ? `/api/customer/addresses/${editing.id}`
        : "/api/customer/addresses";
      await customerFetch(path, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({
          ...draft,
          provinceCode: draft.provinceCode,
          wardCode: draft.wardCode,
        }),
      });
      await load();
      setOpen(false);
    } catch (reason) {
      if (reason instanceof CustomerApiError) setAddressFields(reason.fields);
      setError(apiErrorSummary(reason));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: number) => {
    if (!window.confirm("Xóa địa chỉ này?")) return;
    try {
      await customerFetch(`/api/customer/addresses/${id}`, {
        method: "DELETE",
        body: "{}",
      });
      await load();
    } catch (reason: any) {
      setError(reason.message);
    }
  };
  const setDefault = async (id: number) => {
    try {
      await customerFetch(`/api/customer/addresses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDefault: true }),
      });
      await load();
    } catch (reason: any) {
      setError(reason.message);
    }
  };
  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">
            Giao nhận
          </p>
          <h1 className="mt-2 text-2xl font-black">Sổ địa chỉ</h1>
          <p className="mt-1 text-sm text-slate-400">
            Lưu địa chỉ để dùng nhanh ở bước thanh toán.
          </p>
        </div>
        <button
          onClick={() => start()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Thêm địa chỉ
        </button>
      </header>
      <Notice error={error} success="" />
      {open ? (
        <form ref={addressFormRef} onSubmit={save} noValidate className={`${panel} mb-5 p-5 sm:p-6`}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-bold">
              {editing ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-400 hover:text-white"
            >
              Hủy
            </button>
          </div>
          {editing?.locationSchemaVersion === "legacy_3tier" ? (
            <p
              className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
              role="status"
            >
              Địa chỉ này dùng địa giới cũ. Vui lòng chọn lại tỉnh/thành phố và
              phường/xã hiện hành.
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Họ tên người nhận
              <input
                name="recipientName"
                required
                value={draft.recipientName}
                onChange={(e) =>
                  { setDraft((x: any) => ({
                    ...x,
                    recipientName: e.target.value,
                  })); setAddressFields((current) => { const next = { ...current }; delete next.recipientName; return next; }); }
                }
                onBlur={() => setAddressFields((current) => ({ ...current, recipientName: validateName(String(draft.recipientName || ""), "Họ tên người nhận") }))}
                aria-invalid={Boolean(addressFields.recipientName) || undefined}
                aria-describedby={addressFields.recipientName ? "address-recipient-error" : undefined}
                className={input}
              />
              <FieldError id="address-recipient-error" message={addressFields.recipientName} />
            </label>
            <label className="text-sm font-medium">
              Số điện thoại
              <input
                name="phone"
                required
                value={draft.phone}
                onChange={(e) => { setDraft((x: any) => ({ ...x, phone: e.target.value })); setAddressFields((current) => { const next = { ...current }; delete next.phone; return next; }); }}
                onBlur={() => setAddressFields((current) => ({ ...current, phone: validateVietnamPhone(String(draft.phone || "")) }))}
                aria-invalid={Boolean(addressFields.phone) || undefined}
                aria-describedby={addressFields.phone ? "address-phone-error" : undefined}
                className={input}
              />
              <FieldError id="address-phone-error" message={addressFields.phone} />
            </label>
            <VietnamLocationSelector
              idPrefix="customer-address"
              value={{
                provinceCode: draft.provinceCode || "",
                provinceName: "",
                wardCode: draft.wardCode || "",
                wardName: "",
              }}
              error={addressFields.provinceCode || addressFields.wardCode || undefined}
              onChange={(location) => {
                setAddressFields((current) => { const next = { ...current }; delete next.provinceCode; delete next.wardCode; return next; });
                setDraft((current: any) => ({
                  ...current,
                  provinceCode: location.provinceCode,
                  wardCode: location.wardCode,
                }));
              }}
              className="contents"
            />
            <label className="text-sm font-medium md:col-span-2">
              Địa chỉ cụ thể
              <textarea
                name="address"
                required
                value={draft.address}
                onChange={(e) => { setDraft((x: any) => ({ ...x, address: e.target.value })); setAddressFields((current) => { const next = { ...current }; delete next.address; return next; }); }}
                onBlur={() => setAddressFields((current) => ({ ...current, address: validateAddress(String(draft.address || "")) }))}
                aria-invalid={Boolean(addressFields.address) || undefined}
                aria-describedby={addressFields.address ? "address-detail-error" : undefined}
                className={`${input} min-h-24 resize-y`}
                placeholder="Số nhà, tên đường, tòa nhà..."
              />
              <FieldError id="address-detail-error" message={addressFields.address} />
            </label>
          </div>
          <fieldset className="mt-5">
            <legend className="text-sm font-medium">Loại địa chỉ</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {[
                ["home", "Nhà riêng"],
                ["office", "Văn phòng"],
                ["other", "Khác"],
              ].map(([value, text]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${draft.type === value ? "border-cyan-400 bg-cyan-400/10 text-cyan-100" : "border-[#30303a] text-slate-300"}`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    value={value}
                    checked={draft.type === value}
                    onChange={() =>
                      setDraft((x: any) => ({ ...x, type: value }))
                    }
                  />
                  {text}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              checked={draft.isDefault}
              onChange={(e) =>
                setDraft((x: any) => ({ ...x, isDefault: e.target.checked }))
              }
              type="checkbox"
              className="accent-cyan-400"
            />
            Đặt làm địa chỉ mặc định
          </label>
          <div className="mt-6 flex justify-end">
            <button
              disabled={busy}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold disabled:opacity-60"
            >
              {busy ? "Đang lưu..." : "Lưu địa chỉ"}
            </button>
          </div>
        </form>
      ) : null}
      <div className="grid gap-4">
        {addresses.map((address) => (
          <article
            key={address.id}
            className={`${panel} p-5 ${address.isDefault ? "border-cyan-400/45" : ""}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-violet-400/10 px-2 py-1 text-xs font-semibold text-violet-200">
                    {address.type === "home"
                      ? "Nhà riêng"
                      : address.type === "office"
                        ? "Văn phòng"
                        : "Khác"}
                  </span>
                  {address.isDefault ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-200">
                      <Check className="h-3 w-3" />
                      Mặc định
                    </span>
                  ) : null}
                  {address.locationSchemaVersion === "legacy_3tier" ? (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-200">
                      Địa chỉ theo địa giới cũ
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 font-bold">{address.recipientName}</p>
                <p className="mt-1 text-sm text-slate-300">{address.phone}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {[
                    address.address,
                    address.wardName,
                    address.districtName,
                    address.provinceName,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => start(address)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#30303a] px-3 py-2 text-sm hover:border-cyan-400"
                >
                  <Edit3 className="h-4 w-4" />
                  Sửa
                </button>
                <button
                  onClick={() => remove(address.id)}
                  aria-label={`Xóa địa chỉ ${address.recipientName}`}
                  className="rounded-lg border border-red-500/25 p-2 text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {!address.isDefault ? (
              <button
                onClick={() => setDefault(address.id)}
                className="mt-4 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
              >
                Đặt làm mặc định
              </button>
            ) : (
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-200">
                <MapPin className="h-4 w-4" />
                Địa chỉ giao hàng mặc định
              </p>
            )}
          </article>
        ))}
        {addresses.length === 0 ? (
          <div className={`${panel} p-10 text-center text-slate-400`}>
            <Home className="mx-auto mb-3 h-8 w-8" />
            Chưa có địa chỉ nào. Hãy thêm địa chỉ đầu tiên để thanh toán nhanh
            hơn.
          </div>
        ) : null}
      </div>
    </>
  );
}

export function CustomerOrdersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      const data = await customerFetch(
        `/api/customer/orders?status=${status}&q=${encodeURIComponent(query)}`,
      );
      setItems(data.items);
    } catch (reason: any) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [status]);
  const summary = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((x) => [1, 2].includes(x.status)).length,
      complete: items.filter((x) => x.status === 3).length,
      value: items.reduce((sum, x) => sum + x.totalValue, 0),
    }),
    [items],
  );
  return (
    <>
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">
          Mua sắm
        </p>
        <h1 className="mt-2 text-2xl font-black">Đơn hàng của tôi</h1>
        <p className="mt-1 text-sm text-slate-400">
          Theo dõi các đơn được tạo khi bạn đã đăng nhập.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Tổng đơn", summary.total, "text-blue-300"],
          ["Đang xử lý", summary.pending, "text-amber-300"],
          ["Hoàn tất", summary.complete, "text-emerald-300"],
          ["Tổng giá trị", money(summary.value), "text-violet-300"],
        ].map(([title, value, color]) => (
          <div key={String(title)} className={`${panel} p-4`}>
            <p className="text-xs text-slate-400">{title}</p>
            <p className={`mt-2 text-xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      <div className={`${panel} mt-5 p-4`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
          className="flex flex-col gap-3 md:flex-row"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo mã đơn hàng"
            className="flex-1 rounded-lg border border-[#30303a] bg-[#0c0c11] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
          />
          <button className="rounded-lg border border-cyan-400/40 px-4 py-2 text-sm font-semibold text-cyan-200">
            Tìm đơn
          </button>
        </form>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {[
            [0, "Tất cả"],
            [1, "Chờ xử lý"],
            [2, "Đã xác nhận"],
            [3, "Hoàn tất"],
            [5, "Đã hủy"],
          ].map(([value, text]) => (
            <button
              key={value}
              onClick={() => setStatus(Number(value))}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${status === value ? "border-cyan-400 bg-cyan-400/10 text-cyan-100" : "border-[#30303a] text-slate-400 hover:text-white"}`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>
      <Notice error={error} success="" />
      <div className="mt-5 space-y-3" aria-busy={loading}>
        {items.map((order) => (
          <Link
            key={order.id}
            href={`/tai-khoan/don-hang/${order.id}`}
            className={`${panel} block p-5 transition hover:border-cyan-400/45`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-bold">Đơn hàng #{order.id}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {new Date(order.createTime * 1000).toLocaleString("vi-VN")} ·{" "}
                  {order.title}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-white">
                  {money(order.totalValue)}
                </p>
                <p className="mt-1 text-sm text-cyan-200">
                  {label(order.status)}
                </p>
              </div>
            </div>
          </Link>
        ))}
        {!loading && !items.length ? (
          <div className={`${panel} p-12 text-center text-slate-400`}>
            <ClipboardList className="mx-auto mb-3 h-8 w-8" />
            Chưa tìm thấy đơn hàng phù hợp.
          </div>
        ) : null}
      </div>
    </>
  );
}

export function CustomerOrderDetail({ orderId }: { orderId: number }) {
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void customerFetch(`/api/customer/orders/${orderId}`)
      .then(setOrder)
      .catch((reason: any) => setError(reason.message));
  }, [orderId]);
  if (error) return <Notice error={error} success="" />;
  if (!order) return <p className="text-slate-400">Đang tải đơn hàng...</p>;
  return (
    <>
      <Link
        href="/tai-khoan/don-hang"
        className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200"
      >
        <ChevronLeft className="h-4 w-4" />
        Đơn hàng của tôi
      </Link>
      <header className={`${panel} mt-4 p-5`}>
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">
              Đơn hàng
            </p>
            <h1 className="mt-2 text-2xl font-black">#{order.id}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {new Date(order.createTime * 1000).toLocaleString("vi-VN")}
            </p>
          </div>
          <div className="text-right">
            <p className="rounded-full bg-cyan-400/10 px-3 py-1 text-sm font-semibold text-cyan-100">
              {order.statusLabel}
            </p>
            <p className="mt-3 font-bold">{money(order.totalValue)}</p>
          </div>
        </div>
      </header>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className={`${panel} overflow-hidden`}>
          <h2 className="border-b border-[#252532] p-5 font-bold">Sản phẩm</h2>
          <div>
            {order.items.map((item: any) => (
              <div
                key={item.productId}
                className="flex justify-between gap-4 border-b border-[#252532] p-4 last:border-0"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Số lượng: {item.quantity}
                  </p>
                </div>
                <p className="font-semibold">{money(item.lineTotal)}</p>
              </div>
            ))}
          </div>
        </section>
        <aside className="space-y-4">
          <section className={`${panel} p-5`}>
            <h2 className="font-bold">Giao hàng</h2>
            <p className="mt-3 text-sm text-slate-300">
              {[
                order.delivery.address,
                order.delivery.ward,
                order.delivery.province,
              ]
                .filter(Boolean)
                .join(", ") || "Chưa có thông tin"}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {order.shippingStatus}
            </p>
          </section>
          <section className={`${panel} p-5`}>
            <h2 className="font-bold">Thanh toán</h2>
            <p className="mt-3 flex justify-between text-sm text-slate-300">
              <span>Tổng sản phẩm</span>
              <span>{money(order.totals.subtotal || order.totalValue)}</span>
            </p>
            {order.voucher ? (
              <p className="mt-2 flex justify-between text-sm text-emerald-300">
                <span>Voucher {order.voucher.code}</span>
                <span>-{money(order.voucher.discount)}</span>
              </p>
            ) : null}
            <p className="mt-3 flex justify-between border-t border-[#30303a] pt-3 font-bold">
              <span>Cần thanh toán</span>
              <span>{money(order.totalValue)}</span>
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

export function CustomerChangePasswordPage() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const errors: FieldErrors = {
      currentPassword: form.currentPassword ? "" : "Vui lòng nhập mật khẩu hiện tại.",
      newPassword: form.currentPassword === form.newPassword && form.newPassword ? "Mật khẩu mới phải khác mật khẩu hiện tại." : validatePassword(form.newPassword),
      confirm: validatePasswordConfirmation(form.newPassword, form.confirm),
    };
    for (const field of Object.keys(errors)) if (!errors[field]) delete errors[field];
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Vui lòng sửa các trường được đánh dấu bên dưới.");
      window.setTimeout(() => focusFirstInvalidField(formRef.current, errors));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await customerFetch("/api/customer/auth/change-password", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setSuccess("Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (reason) {
      if (reason instanceof CustomerApiError) setFieldErrors(reason.fields);
      setError(apiErrorSummary(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">
          Bảo mật
        </p>
        <h1 className="mt-2 text-2xl font-black">Đổi mật khẩu</h1>
        <p className="mt-1 text-sm text-slate-400">
          Sau khi đổi, các phiên đăng nhập cũ sẽ được đăng xuất.
        </p>
      </header>
      <form ref={formRef} onSubmit={submit} noValidate className={`${panel} max-w-xl p-5 sm:p-7`}>
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Mật khẩu hiện tại
            <input
              name="currentPassword"
              required
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(e) =>
                { setForm((x) => ({ ...x, currentPassword: e.target.value })); setFieldErrors((current) => { const next = { ...current }; delete next.currentPassword; return next; }); }
              }
              onBlur={() => setFieldErrors((current) => ({ ...current, currentPassword: form.currentPassword ? "" : "Vui lòng nhập mật khẩu hiện tại." }))}
              aria-invalid={Boolean(fieldErrors.currentPassword) || undefined}
              aria-describedby={fieldErrors.currentPassword ? "account-current-password-error" : undefined}
              className={input}
            />
            <FieldError id="account-current-password-error" message={fieldErrors.currentPassword} />
          </label>
          <label className="block text-sm font-medium">
            Mật khẩu mới
            <input
              name="newPassword"
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(e) =>
                { setForm((x) => ({ ...x, newPassword: e.target.value })); setFieldErrors((current) => { const next = { ...current }; delete next.newPassword; return next; }); }
              }
              onBlur={() => setFieldErrors((current) => ({ ...current, newPassword: form.currentPassword === form.newPassword && form.newPassword ? "Mật khẩu mới phải khác mật khẩu hiện tại." : validatePassword(form.newPassword) }))}
              aria-invalid={Boolean(fieldErrors.newPassword) || undefined}
              aria-describedby={`account-password-hint${fieldErrors.newPassword ? " account-new-password-error" : ""}`}
              className={input}
            />
            <FieldError id="account-new-password-error" message={fieldErrors.newPassword} />
          </label>
          <label className="block text-sm font-medium">
            Nhập lại mật khẩu
            <input
              name="confirm"
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) =>
                { setForm((x) => ({ ...x, confirm: e.target.value })); setFieldErrors((current) => { const next = { ...current }; delete next.confirm; return next; }); }
              }
              onBlur={() => setFieldErrors((current) => ({ ...current, confirm: validatePasswordConfirmation(form.newPassword, form.confirm) }))}
              aria-invalid={Boolean(fieldErrors.confirm) || undefined}
              aria-describedby={fieldErrors.confirm ? "account-confirm-password-error" : undefined}
              className={input}
            />
            <FieldError id="account-confirm-password-error" message={fieldErrors.confirm} />
          </label>
        </div>
        <PasswordRequirements
          password={form.newPassword}
          id="account-password-hint"
        />
        <button
          disabled={busy}
          className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold hover:bg-blue-500 disabled:opacity-60"
        >
          {busy ? "Đang cập nhật..." : "Đổi mật khẩu"}
        </button>
        <Notice error={error} success={success} />
      </form>
    </>
  );
}
