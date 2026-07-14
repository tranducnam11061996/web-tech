"use client";

import { FormEvent, useState } from "react";
import { validatePriceRange } from "@/lib/storefrontValidation";

export function BrandCatalogFilters({
  sort,
  minPrice,
  maxPrice,
  bounds,
}: {
  sort: string;
  minPrice: string;
  maxPrice: string;
  bounds: { min: number; max: number };
}) {
  const [min, setMin] = useState(minPrice);
  const [max, setMax] = useState(maxPrice);
  const [error, setError] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (!min && !max) return;
    const validation = validatePriceRange(min || bounds.min, max || bounds.max, bounds);
    const message = validation.minPrice || validation.maxPrice || "";
    setError(message);
    if (message) event.preventDefault();
  };
  return (
    <form method="get" onSubmit={submit} noValidate className="mt-6 grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]" aria-label="Lọc sản phẩm thương hiệu">
      <label className="text-xs font-semibold text-zinc-400">Sắp xếp
        <select name="sort" defaultValue={["newest", "price_asc", "price_desc"].includes(sort) ? sort : "newest"} className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white">
          <option value="newest">Mới nhất</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option>
        </select>
      </label>
      <label className="text-xs font-semibold text-zinc-400">Giá từ
        <input name="min-price" type="number" min={bounds.min} max={bounds.max} step="1" value={min} onChange={(event) => { setMin(event.target.value); setError(""); }} placeholder={String(bounds.min)} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? "brand-price-error" : undefined} className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white" />
      </label>
      <label className="text-xs font-semibold text-zinc-400">Giá đến
        <input name="max-price" type="number" min={bounds.min} max={bounds.max} step="1" value={max} onChange={(event) => { setMax(event.target.value); setError(""); }} placeholder={String(bounds.max)} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? "brand-price-error" : undefined} className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white" />
      </label>
      <button type="submit" className="self-end rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">Áp dụng</button>
      {error ? <p id="brand-price-error" role="alert" className="text-xs text-red-300 sm:col-span-4">{error}</p> : null}
    </form>
  );
}
