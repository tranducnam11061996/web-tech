'use client';

import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  filterCollectionParentOptions,
  type CollectionOption,
  type CollectionParentOption,
} from './collection-parent-options';

type SelectableOption = CollectionParentOption | {
  id: 0;
  name: string;
  parentId: 0;
  level: 0;
};

export function CollectionParentCombobox({
  collections,
  options,
  value,
  onChange,
  loading,
  error,
  controlClassName,
}: {
  collections: CollectionOption[];
  options: CollectionParentOption[];
  value: string;
  onChange: (parentId: number) => void;
  loading: boolean;
  error: string;
  controlClassName: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const labelId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = collections.find((collection) => collection.id === Number(value));
  const filtered = useMemo(
    () => filterCollectionParentOptions(options, query),
    [options, query],
  );
  const selectableOptions = useMemo<SelectableOption[]>(() => [
    { id: 0, name: 'Không có bộ sưu tập cha', parentId: 0, level: 0 },
    ...filtered,
  ], [filtered]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => searchRef.current?.focus(), 0);

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${selectableOptions[activeIndex]?.id}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, listId, open, selectableOptions]);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  const choose = (option: SelectableOption) => {
    onChange(option.id);
    close(true);
  };

  const openDropdown = () => {
    const selectedIndex = selectableOptions.findIndex((option) => String(option.id) === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const moveActive = (offset: number) => {
    setActiveIndex((current) => Math.max(0, Math.min(current + offset, selectableOptions.length - 1)));
  };

  return (
    <div ref={rootRef} className="relative space-y-1">
      <span id={labelId} className="text-sm font-medium text-gray-300">Bộ sưu tập cha</span>
      <button
        ref={triggerRef}
        type="button"
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          if (open) close(false);
          else openDropdown();
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) openDropdown();
          } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            close(false);
          }
        }}
        className={`${controlClassName} flex items-center justify-between text-left`}
      >
        <span className="truncate">
          {value === '0'
            ? 'Không có bộ sưu tập cha'
            : selected
              ? `#${selected.id} - ${selected.name}`
              : `Bộ sưu tập #${value}`}
        </span>
        <ChevronDown
          className={`ml-3 size-4 shrink-0 text-gray-500 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-md border border-gray-700 bg-[#0d111a] shadow-2xl">
          <div className="relative border-b border-gray-800 p-2">
            <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-label="Tìm bộ sưu tập cha"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={selectableOptions[activeIndex] ? `${listId}-${selectableOptions[activeIndex].id}` : undefined}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  moveActive(1);
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  moveActive(-1);
                } else if (event.key === 'Home') {
                  event.preventDefault();
                  setActiveIndex(0);
                } else if (event.key === 'End') {
                  event.preventDefault();
                  setActiveIndex(Math.max(0, selectableOptions.length - 1));
                } else if (event.key === 'Enter' && selectableOptions[activeIndex]) {
                  event.preventDefault();
                  choose(selectableOptions[activeIndex]);
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  close(true);
                }
              }}
              placeholder="Tìm theo tên hoặc ID bộ sưu tập..."
              className="w-full rounded-md border border-gray-700 bg-gray-950 py-2 pl-9 pr-3 text-sm text-gray-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
            />
          </div>

          <ul id={listId} role="listbox" aria-labelledby={labelId} className="max-h-72 overflow-y-auto p-1 custom-scrollbar">
            {selectableOptions.map((option, index) => (
              <li
                key={option.id}
                id={`${listId}-${option.id}`}
                role="option"
                aria-selected={String(option.id) === value}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
                className={`flex cursor-pointer items-center justify-between rounded px-3 py-2 text-sm ${
                  index === activeIndex ? 'bg-blue-600/20 text-blue-200' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className="truncate" style={{ paddingLeft: `${option.level * 18}px` }}>
                  {option.level > 0 ? '- ' : ''}{option.id === 0 ? option.name : `#${option.id} - ${option.name}`}
                </span>
                {String(option.id) === value && <Check className="ml-3 size-4 shrink-0 text-emerald-400" aria-hidden="true" />}
              </li>
            ))}
            {loading && <li className="px-3 py-4 text-center text-xs text-gray-500">Đang tải bộ sưu tập...</li>}
            {!loading && error && <li className="px-3 py-4 text-center text-xs text-red-300">{error}</li>}
            {!loading && !error && filtered.length === 0 && query.trim() && (
              <li className="px-3 py-4 text-center text-xs text-gray-500">Không tìm thấy bộ sưu tập phù hợp</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
