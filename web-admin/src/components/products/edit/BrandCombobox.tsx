'use client';

import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

export type BrandOption = { id: number; name: string };

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function BrandCombobox({
  brands,
  value,
  onChange,
}: {
  brands: BrandOption[];
  value: number;
  onChange: (brandId: number, brandName: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = brands.find((brand) => brand.id === Number(value));
  const filtered = useMemo(() => {
    const keyword = normalizeSearch(query.trim());
    if (!keyword) return brands;
    return brands.filter((brand) => normalizeSearch(brand.name).includes(keyword));
  }, [brands, query]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const choose = (brand: BrandOption) => {
    onChange(brand.id, brand.name);
    setOpen(false);
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && filtered[activeIndex] ? `${listId}-${filtered[activeIndex].id}` : undefined}
          value={open ? query : selected?.name || ''}
          placeholder={open ? 'Nhập tên thương hiệu...' : 'Chưa chọn thương hiệu'}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === 'Enter' && open && filtered[activeIndex]) {
              event.preventDefault();
              choose(filtered[activeIndex]);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              setQuery('');
            }
          }}
          className="w-full rounded-sm border border-gray-700 bg-gray-900 py-2 pl-9 pr-9 text-sm text-gray-200 shadow-inner outline-none transition-all focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30"
        />
        <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </div>

      {open && (
        <ul id={listId} role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-sm border border-gray-700 bg-[#0d111a] p-1 shadow-2xl custom-scrollbar">
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-center text-xs text-gray-500">Không tìm thấy thương hiệu</li>
          ) : filtered.map((brand, index) => (
            <li
              key={brand.id}
              id={`${listId}-${brand.id}`}
              role="option"
              aria-selected={brand.id === Number(value)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(brand)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-sm ${index === activeIndex ? 'bg-blue-600/20 text-blue-200' : 'text-gray-300 hover:bg-gray-800'}`}
            >
              <span className="truncate">{brand.name}</span>
              {brand.id === Number(value) && <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
