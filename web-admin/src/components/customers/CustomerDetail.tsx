"use client";

import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Pencil,
  Plus,
  Save,
  ShieldOff,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Address = {
  id: number;
  recipientName: string;
  phone: string;
  type: string;
  address: string;
  provinceId: number | null;
  provinceCode: string | null;
  provinceName: string;
  districtId: number | null;
  districtName: string;
  wardId: number | null;
  wardCode: string | null;
  wardName: string;
  locationSchemaVersion: "legacy_3tier" | "2025_2tier";
  isDefault: boolean;
};
type Detail = any;
type AddressDraft = {
  recipientName: string;
  phone: string;
  type: string;
  address: string;
  provinceCode: string;
  wardCode: string;
  isDefault: boolean;
};
const EMPTY_ADDRESS: AddressDraft = {
  recipientName: "",
  phone: "",
  type: "home",
  address: "",
  provinceCode: "",
  wardCode: "",
  isDefault: false,
};
const money = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(value || 0)}đ`;
const date = (value: string | number | null) =>
  value
    ? new Date(typeof value === "number" ? value * 1000 : value).toLocaleString(
        "vi-VN",
      )
    : "—";

function Pill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "cyan" | "emerald" | "red" | "amber";
}) {
  const tones = {
    slate: "border-slate-700 bg-slate-900 text-slate-200",
    cyan: "border-cyan-800 bg-cyan-950/50 text-cyan-200",
    emerald: "border-emerald-800 bg-emerald-950/50 text-emerald-200",
    red: "border-red-800 bg-red-950/50 text-red-200",
    amber: "border-amber-800 bg-amber-950/50 text-amber-200",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

export function CustomerDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [data, setData] = useState<Detail>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState({
    name: "",
    gender: "",
    birthday: "",
  });
  const [editingAddress, setEditingAddress] = useState<number | null | "new">(
    null,
  );
  const [address, setAddress] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [provinces, setProvinces] = useState<
    Array<{ code: string; name: string; divisionType: string }>
  >([]);
  const [wards, setWards] = useState<
    Array<{
      code: string;
      provinceCode: string;
      name: string;
      divisionType: string;
    }>
  >([]);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [wardRetry, setWardRetry] = useState(0);
  const wardAbortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (orderCursor?: number) => {
      if (!Number.isInteger(id) || id <= 0) {
        setError("Mã khách hàng không hợp lệ.");
        setLoading(false);
        return;
      }
      if (!orderCursor) setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/admin/storefront-customers/${id}${orderCursor ? `?orderCursor=${orderCursor}` : ""}`,
          { cache: "no-store" },
        );
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success)
          throw new Error(
            result?.error?.message || "Không thể tải hồ sơ khách hàng.",
          );
        setData((previous: Detail) =>
          orderCursor && previous
            ? {
                ...result.data,
                orders: [...previous.orders, ...result.data.orders],
              }
            : result.data,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải hồ sơ khách hàng.",
        );
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void fetch("/api/customer/locations/provinces")
      .then((response) => response.json())
      .then((result) => {
        if (result?.success) setProvinces(result.data.items || []);
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    wardAbortRef.current?.abort();
    if (!address.provinceCode) {
      setWards([]);
      setWardsLoading(false);
      setLocationError("");
      return;
    }
    const controller = new AbortController();
    wardAbortRef.current = controller;
    setWardsLoading(true);
    setLocationError("");
    void fetch(
      `/api/customer/locations/wards?provinceCode=${encodeURIComponent(address.provinceCode)}`,
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then((result) => {
        if (!result?.success) throw new Error(result?.error?.message);
        setWards(result.data.items || []);
      })
      .catch((loadError) => {
        if (loadError?.name === "AbortError") return;
        setLocationError(
          "Không thể tải danh sách phường/xã. Vui lòng thử lại.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setWardsLoading(false);
      });
    return () => controller.abort();
  }, [address.provinceCode, wardRetry]);
  useEffect(() => {
    if (data?.customer)
      setProfile({
        name: data.customer.name || "",
        gender: data.customer.gender || "",
        birthday: data.customer.birthday || "",
      });
  }, [data?.customer]);

  const perform = async (
    url: string,
    method: string,
    body?: unknown,
    success = "Đã cập nhật.",
  ) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success)
        throw new Error(
          result?.error?.message || "Không thể cập nhật khách hàng.",
        );
      if (result.data?.customer) setData(result.data);
      setMessage(success);
      return true;
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Không thể cập nhật khách hàng.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openAddress = (value?: Address) => {
    setEditingAddress(value ? value.id : "new");
    setAddress(
      value
        ? {
            recipientName: value.recipientName,
            phone: value.phone,
            type: value.type,
            address: value.address,
            provinceCode: value.provinceCode || "",
            wardCode: value.wardCode || "",
            isDefault: value.isDefault,
          }
        : { ...EMPTY_ADDRESS, isDefault: data?.addresses?.length === 0 },
    );
  };
  const saveAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    const endpoint =
      editingAddress === "new"
        ? `/api/admin/storefront-customers/${id}/addresses`
        : `/api/admin/storefront-customers/${id}/addresses/${editingAddress}`;
    const ok = await perform(
      endpoint,
      editingAddress === "new" ? "POST" : "PATCH",
      address,
      editingAddress === "new" ? "Đã thêm địa chỉ." : "Đã cập nhật địa chỉ.",
    );
    if (ok) setEditingAddress(null);
  };
  const customer = data?.customer;
  const metrics = data?.metrics;

  if (loading)
    return (
      <div
        className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-slate-400"
        role="status"
      >
        Đang tải hồ sơ khách hàng...
      </div>
    );
  if (!data || (error && !customer))
    return (
      <div
        className="rounded-xl border border-red-900/70 bg-red-950/25 p-8"
        role="alert"
      >
        <p className="text-red-200">{error || "Không tìm thấy khách hàng."}</p>
        <button
          type="button"
          onClick={() => router.push("/customers")}
          className="mt-4 rounded-lg border border-red-800 px-3 py-2 text-sm text-red-100"
        >
          Quay lại danh sách
        </button>
      </div>
    );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/customers")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Danh sách khách hàng
        </button>
        <span className="text-xs text-slate-500">
          Email và số điện thoại là định danh đăng nhập, chỉ đọc trong CRM.
        </span>
      </div>
      <header className="rounded-2xl border border-cyan-900/70 bg-[linear-gradient(120deg,rgba(8,47,73,.45),rgba(15,23,42,.82))] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="font-mono text-sm text-cyan-300">KH #{customer.id}</p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              {customer.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone={customer.status === "blocked" ? "red" : "cyan"}>
                {customer.status === "blocked" ? "Đã khóa" : "Đang hoạt động"}
              </Pill>
              <Pill tone={customer.verified ? "emerald" : "amber"}>
                {customer.verified
                  ? "Email đã xác minh"
                  : "Email chưa xác minh"}
              </Pill>
              <Pill>Tham gia {date(customer.createdAt)}</Pill>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void perform(
                  `/api/admin/storefront-customers/${id}`,
                  "PATCH",
                  { action: "revoke_sessions" },
                  "Đã đăng xuất mọi thiết bị.",
                )
              }
              className="inline-flex items-center gap-2 rounded-lg border border-amber-800 bg-amber-950/30 px-3 py-2 text-sm font-bold text-amber-100 hover:bg-amber-950/60 disabled:opacity-50"
            >
              <ShieldOff className="h-4 w-4" aria-hidden="true" />
              Thu hồi phiên
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void perform(
                  `/api/admin/storefront-customers/${id}`,
                  "PATCH",
                  {
                    action: "status",
                    status:
                      customer.status === "blocked" ? "active" : "blocked",
                  },
                  customer.status === "blocked"
                    ? "Đã mở khóa tài khoản."
                    : "Đã khóa tài khoản và thu hồi phiên.",
                )
              }
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white disabled:opacity-50 ${customer.status === "blocked" ? "bg-emerald-700 hover:bg-emerald-600" : "bg-red-700 hover:bg-red-600"}`}
            >
              {customer.status === "blocked" ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Ban className="h-4 w-4" aria-hidden="true" />
              )}
              {customer.status === "blocked" ? "Mở khóa" : "Khóa tài khoản"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Chỉ xóa khách hàng chưa có đơn. Bạn có chắc chắn?",
                  )
                )
                  void perform(
                    `/api/admin/storefront-customers/${id}`,
                    "DELETE",
                    undefined,
                    "Đã xóa khách hàng.",
                  ).then((ok) => {
                    if (ok) router.push("/customers");
                  });
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-red-800 px-3 py-2 text-sm font-bold text-red-200 hover:bg-red-950/50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Xóa
            </button>
          </div>
        </div>
      </header>
      {message ? (
        <p
          className="rounded-lg border border-emerald-800 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-200"
          role="status"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          className="rounded-lg border border-red-800 bg-red-950/35 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-4">
          <section className="rounded-2xl border border-slate-800 bg-slate-950/65 p-5">
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              <h2 className="font-bold text-white">Thông tin hồ sơ</h2>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void perform(
                  `/api/admin/storefront-customers/${id}`,
                  "PATCH",
                  { action: "profile", ...profile },
                  "Đã lưu hồ sơ khách hàng.",
                );
              }}
              className="mt-4 grid gap-3 md:grid-cols-2"
            >
              <label>
                <span className="mb-1 block text-xs text-slate-400">
                  Họ và tên
                </span>
                <input
                  required
                  minLength={2}
                  maxLength={150}
                  value={profile.name}
                  onChange={(event) =>
                    setProfile({ ...profile, name: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
              </label>
              <label>
                <span className="mb-1 block text-xs text-slate-400">
                  Giới tính
                </span>
                <select
                  value={profile.gender}
                  onChange={(event) =>
                    setProfile({ ...profile, gender: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                >
                  <option value="">Chưa chọn</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs text-slate-400">
                  Ngày sinh
                </span>
                <input
                  type="date"
                  value={profile.birthday}
                  onChange={(event) =>
                    setProfile({ ...profile, birthday: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
              </label>
              <div>
                <span className="mb-1 block text-xs text-slate-400">
                  Định danh đăng nhập
                </span>
                <p className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-300">
                  {customer.email}
                  <br />
                  {customer.phone}
                </p>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Lưu hồ sơ
                </button>
              </div>
            </form>
          </section>
          <section className="rounded-2xl border border-indigo-900/70 bg-indigo-950/15 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin
                  className="h-5 w-5 text-indigo-300"
                  aria-hidden="true"
                />
                <h2 className="font-bold text-white">Sổ địa chỉ</h2>
              </div>
              <button
                type="button"
                onClick={() => openAddress()}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-700 bg-indigo-950/50 px-3 py-2 text-sm font-bold text-indigo-100 hover:bg-indigo-900/60"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Thêm địa chỉ
              </button>
            </div>
            {editingAddress !== null ? (
              <form
                onSubmit={saveAddress}
                className="mt-4 grid gap-3 rounded-xl border border-indigo-800/70 bg-slate-950/70 p-4 md:grid-cols-2"
              >
                <h3 className="md:col-span-2 font-semibold text-indigo-100">
                  {editingAddress === "new" ? "Thêm địa chỉ" : "Sửa địa chỉ"}
                </h3>
                <label>
                  <span className="mb-1 block text-xs text-slate-400">
                    Người nhận
                  </span>
                  <input
                    required
                    value={address.recipientName}
                    onChange={(event) =>
                      setAddress({
                        ...address,
                        recipientName: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs text-slate-400">
                    Điện thoại
                  </span>
                  <input
                    required
                    value={address.phone}
                    onChange={(event) =>
                      setAddress({ ...address, phone: event.target.value })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs text-slate-400">
                    Loại địa chỉ
                  </span>
                  <select
                    value={address.type}
                    onChange={(event) =>
                      setAddress({ ...address, type: event.target.value })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    <option value="home">Nhà riêng</option>
                    <option value="office">Văn phòng</option>
                    <option value="other">Khác</option>
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs text-slate-400">
                    Tỉnh/thành phố
                  </span>
                  <select
                    required
                    value={address.provinceCode}
                    onChange={(event) =>
                      setAddress({
                        ...address,
                        provinceCode: event.target.value,
                        wardCode: "",
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Chọn tỉnh/thành phố</option>
                    {provinces.map((province) => (
                      <option key={province.code} value={province.code}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs text-slate-400">
                    Phường/xã/đặc khu
                  </span>
                  <select
                    required
                    value={address.wardCode}
                    onChange={(event) =>
                      setAddress({ ...address, wardCode: event.target.value })
                    }
                    disabled={!address.provinceCode || wardsLoading}
                    aria-describedby={
                      locationError ? "admin-ward-error" : undefined
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    <option value="">
                      {wardsLoading ? "Đang tải..." : "Chọn phường/xã/đặc khu"}
                    </option>
                    {wards.map((ward) => (
                      <option key={ward.code} value={ward.code}>
                        {ward.name}
                      </option>
                    ))}
                  </select>
                </label>
                {locationError ? (
                  <div
                    id="admin-ward-error"
                    className="md:col-span-2 flex items-center gap-3 text-sm text-red-300"
                    role="alert"
                  >
                    <span>{locationError}</span>
                    <button
                      type="button"
                      onClick={() => setWardRetry((value) => value + 1)}
                      className="rounded border border-red-800 px-2 py-1 font-semibold hover:bg-red-950/50"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : null}
                {editingAddress !== "new" &&
                data.addresses.find(
                  (item: Address) => item.id === editingAddress,
                )?.locationSchemaVersion === "legacy_3tier" ? (
                  <p className="md:col-span-2 rounded-lg border border-amber-800/70 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
                    Địa chỉ này dùng địa giới cũ. Vui lòng chọn lại tỉnh/thành
                    phố và phường/xã hiện hành trước khi lưu.
                  </p>
                ) : null}
                <label className="md:col-span-2">
                  <span className="mb-1 block text-xs text-slate-400">
                    Địa chỉ chi tiết
                  </span>
                  <input
                    required
                    minLength={4}
                    value={address.address}
                    onChange={(event) =>
                      setAddress({ ...address, address: event.target.value })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={address.isDefault}
                    onChange={(event) =>
                      setAddress({
                        ...address,
                        isDefault: event.target.checked,
                      })
                    }
                  />
                  Đặt làm địa chỉ mặc định
                </label>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAddress(null)}
                    className="rounded-lg px-3 py-2 text-sm text-slate-300"
                  >
                    Hủy
                  </button>
                  <button
                    disabled={busy}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Lưu địa chỉ
                  </button>
                </div>
              </form>
            ) : null}
            <div className="mt-4 grid gap-3">
              {data.addresses.length === 0 ? (
                <p className="rounded-lg border border-dashed border-indigo-900/70 p-4 text-sm text-slate-500">
                  Khách hàng chưa lưu địa chỉ giao hàng.
                </p>
              ) : (
                data.addresses.map((item: Address) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-indigo-900/50 bg-slate-950/45 p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {item.recipientName} · {item.phone}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          {[
                            item.address,
                            item.wardName,
                            item.districtName,
                            item.provinceName,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        <div className="mt-2 flex gap-2">
                          {item.isDefault ? (
                            <Pill tone="emerald">Mặc định</Pill>
                          ) : (
                            <Pill>
                              {item.type === "office"
                                ? "Văn phòng"
                                : item.type === "other"
                                  ? "Khác"
                                  : "Nhà riêng"}
                            </Pill>
                          )}
                          {item.locationSchemaVersion === "legacy_3tier" ? (
                            <Pill tone="amber">Địa giới cũ</Pill>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex h-fit gap-2">
                        <button
                          type="button"
                          onClick={() => openAddress(item)}
                          aria-label={`Sửa địa chỉ ${item.recipientName}`}
                          className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        {!item.isDefault ? (
                          <button
                            type="button"
                            onClick={() =>
                              void perform(
                                `/api/admin/storefront-customers/${id}/addresses/${item.id}`,
                                "PATCH",
                                { action: "set_default" },
                                "Đã đặt địa chỉ mặc định.",
                              )
                            }
                            aria-label={`Đặt địa chỉ ${item.recipientName} làm mặc định`}
                            className="rounded-lg border border-emerald-800 p-2 text-emerald-300 hover:bg-emerald-950/60"
                          >
                            <CheckCircle2
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Xóa địa chỉ này?"))
                              void perform(
                                `/api/admin/storefront-customers/${id}/addresses/${item.id}`,
                                "DELETE",
                                undefined,
                                "Đã xóa địa chỉ.",
                              );
                          }}
                          aria-label={`Xóa địa chỉ ${item.recipientName}`}
                          className="rounded-lg border border-red-900 p-2 text-red-300 hover:bg-red-950/60"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
          <section className="overflow-x-auto rounded-2xl border border-blue-900/70 bg-blue-950/15">
            <div className="flex items-center justify-between border-b border-blue-900/60 p-5">
              <div className="flex items-center gap-2">
                <ClipboardList
                  className="h-5 w-5 text-blue-300"
                  aria-hidden="true"
                />
                <h2 className="font-bold text-white">Lịch sử đơn hàng</h2>
              </div>
              <span className="text-xs text-blue-200">
                {metrics.orderCount} đơn đã liên kết
              </span>
            </div>
            <table className="min-w-[700px] w-full text-sm">
              <thead className="bg-blue-950/40 text-left text-xs uppercase text-blue-200/80">
                <tr>
                  <th className="p-3">Đơn</th>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right">Tổng tiền</th>
                  <th className="p-3">
                    <span className="sr-only">Xem đơn</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order: any) => (
                  <tr
                    key={order.id}
                    className="border-t border-blue-950/70 odd:bg-slate-950/30 even:bg-blue-950/15"
                  >
                    <td className="p-3">
                      <p className="font-mono font-semibold text-cyan-300">
                        #{order.id}
                      </p>
                      <p className="max-w-80 truncate text-xs text-slate-400">
                        {order.title}
                      </p>
                    </td>
                    <td className="p-3 text-xs text-slate-400">
                      {date(order.createTime)}
                    </td>
                    <td className="p-3">
                      <Pill
                        tone={
                          order.status === 3
                            ? "emerald"
                            : [4, 5].includes(order.status)
                              ? "red"
                              : "amber"
                        }
                      >
                        {order.statusLabel}
                      </Pill>
                    </td>
                    <td className="p-3 text-right font-semibold text-white">
                      {money(order.totalValue)}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => router.push(`/sales/orders/${order.id}`)}
                        className="text-xs font-semibold text-blue-200 hover:text-white"
                      >
                        Mở đơn
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.orders.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                Khách hàng chưa có đơn storefront được liên kết.
              </p>
            ) : null}
            {data.nextOrderCursor ? (
              <button
                type="button"
                onClick={() => void load(data.nextOrderCursor)}
                className="m-4 w-[calc(100%-2rem)] rounded-lg border border-blue-800 py-2 text-sm text-blue-200 hover:bg-blue-950/60"
              >
                Tải thêm đơn hàng
              </button>
            ) : null}
          </section>
        </main>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-emerald-900/70 bg-emerald-950/15 p-5">
            <h2 className="font-bold text-emerald-100">Chỉ số mua hàng</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric
                label="Tổng đơn"
                value={metrics.orderCount}
                tone="border-emerald-900/70 bg-slate-950/50"
              />
              <Metric
                label="Hoàn tất"
                value={metrics.completedOrderCount}
                tone="border-emerald-900/70 bg-slate-950/50"
              />
              <Metric
                label="Đang xử lý"
                value={metrics.pendingOrderCount}
                tone="border-emerald-900/70 bg-slate-950/50"
              />
              <Metric
                label="Chi tiêu"
                value={money(metrics.totalCompletedValue)}
                tone="border-emerald-900/70 bg-slate-950/50"
              />
            </div>
          </section>
          <section className="rounded-2xl border border-amber-900/70 bg-amber-950/15 p-5">
            <h2 className="font-bold text-amber-100">Bảo mật và phiên</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Phiên đang hoạt động</dt>
                <dd className="font-bold text-white">
                  {data.security.activeSessions}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Hoạt động phiên cuối</dt>
                <dd className="text-right text-slate-200">
                  {date(data.security.lastSessionAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Đăng nhập cuối</dt>
                <dd className="text-right text-slate-200">
                  {date(customer.lastLoginAt)}
                </dd>
              </div>
            </dl>
          </section>
          <section className="rounded-2xl border border-violet-900/70 bg-violet-950/15 p-5">
            <h2 className="font-bold text-violet-100">Nhật ký quản trị</h2>
            <div className="mt-4 space-y-3">
              {data.audit.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Chưa có thao tác CRM được ghi nhận.
                </p>
              ) : (
                data.audit.map((event: any) => (
                  <div
                    key={event.id}
                    className="border-l-2 border-violet-600 pl-3"
                  >
                    <p className="text-sm text-slate-100">
                      {event.action
                        .replace("customer.", "")
                        .replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {event.actor} · {date(event.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
