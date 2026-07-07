// Quản lý bộ nhớ cache dùng chung cho search engine
import pool from './db';
import Fuse from 'fuse.js';

export interface SearchProduct {
 id: number;
 storeSKU: string;
 proName: string;
 searchText: string;
 normalizedName: string;
}

export const searchCache: {
 cachedProducts: SearchProduct[] | null;
 isWarming: boolean;
 warmPromise: Promise<void> | null;
} = {
 cachedProducts: null,
 isWarming: false,
 warmPromise: null,
};

export const SYNONYM_GROUPS: string[][] = [
 ['laptop', 'may tinh xach tay'],
 ['vga', 'card do hoa', 'card man hinh'],
 ['chuot', 'mouse'],
 ['ban phim', 'keyboard'],
 ['man hinh', 'monitor', 'lcd', 'display'],
 ['cpu', 'chip', 'bo vi xu ly', 'vi xu ly'],
 ['ram', 'bo nho trong', 'bo nho ram'],
 ['ssd', 'o cung', 'hdd', 'o cung the ran'],
];

// Pre-compile Regexes
const SYNONYM_REGEXES = SYNONYM_GROUPS.map(group =>
 group.map(word => ({
   word,
   regex: new RegExp(`(^|\\s)${word}($|\\s)`),
 }))
);

export function injectSynonyms(text: string): string {
 if (!text) return text;
 const appendedSynonyms: string[] = [];

 for (const group of SYNONYM_REGEXES) {
   let hasMatch = false;
   for (const item of group) {
     if (item.regex.test(text)) { hasMatch = true; break; }
   }
   if (hasMatch) {
     for (const item of group) {
       if (!item.regex.test(text)) appendedSynonyms.push(item.word);
     }
   }
 }

 return appendedSynonyms.length > 0 ? text + ' ' + appendedSynonyms.join(' ') : text;
}

export function removeVietnameseTones(str: string): string {
 if (!str) return '';
 str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
 str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
 str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
 str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
 str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
 str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
 str = str.replace(/đ/g, 'd');
 str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
 str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
 str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
 str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
 str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
 str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
 str = str.replace(/Đ/g, 'D');
 str = str.replace(/[^a-zA-Z0-9\s]/g, ' ');
 str = str.replace(/\s+/g, ' ').trim();
 return str.toLowerCase();
}

export async function preWarmSearchCache(): Promise<void> {
 if (searchCache.cachedProducts || searchCache.isWarming) return;

 searchCache.isWarming = true;
 searchCache.warmPromise = (async () => {
   try {
     const [rows] = await pool.query<{
       id: number;
       storeSKU: string;
       proName: string;
     }>(`
       SELECT p.id, p.storeSKU, p.proName
       FROM idv_sell_product_store p
       WHERE p.id > 0
       LIMIT 50000
     `);

     const products: SearchProduct[] = rows.map(row => {
       const rawText = `${row.storeSKU || ''} ${row.proName || ''}`.trim();
       const normalized = removeVietnameseTones(rawText);
       const searchText = injectSynonyms(normalized);

       return {
         id: row.id,
         storeSKU: row.storeSKU || '',
         proName: row.proName || '',
         searchText,
         normalizedName: normalized,
       };
     });

     searchCache.cachedProducts = products;
     console.log(`[SearchCache] Pre-warmed: ${products.length} products loaded into RAM`);
   } catch (error) {
     console.error('[SearchCache] Pre-warm failed:', error);
   } finally {
     searchCache.isWarming = false;
     searchCache.warmPromise = null;
   }
 })();

 await searchCache.warmPromise;
}

// Kick off warming at module load time (once per process)
// This runs in the server process, not in the browser.
// We fire it and forget — results are available to all request handlers.
try {
 if (typeof window === 'undefined') {
   preWarmSearchCache().catch(err => {
     console.error('[SearchCache] Module-level warm failed:', err);
   });
 }
} catch (e) {
 // no-op: preWarm is async; any runtime errors are caught in the function itself
}
