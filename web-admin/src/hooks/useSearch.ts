'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

/**
 * Reusable search hook for management screens.
 * Manages the `search` query parameter in the URL.
 * 
 * Usage:
 *   const { keyword, setKeyword, handleSearch, handleClear } = useSearch();
 *   <input value={keyword} onChange={e => setKeyword(e.target.value)} />
 *   <button onClick={handleSearch}>Tìm kiếm</button>
 */
export function useSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize keyword from URL
  const initialKeyword = searchParams.get('search') || '';
  const [keyword, setKeyword] = useState(initialKeyword);

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = keyword.trim();

    if (trimmed) {
      params.set('search', trimmed);
    } else {
      params.delete('search');
    }
    // Reset to page 1 when searching
    params.set('page', '1');

    router.push(pathname + '?' + params.toString());
  }, [keyword, pathname, router, searchParams]);

  const handleClear = useCallback(() => {
    setKeyword('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    params.set('page', '1');
    router.push(pathname + '?' + params.toString());
  }, [pathname, router, searchParams]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  return {
    keyword,
    setKeyword,
    handleSearch,
    handleClear,
    handleKeyDown,
    isSearching: !!searchParams.get('search'),
  };
}
