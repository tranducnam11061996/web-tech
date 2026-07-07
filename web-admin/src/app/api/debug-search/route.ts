import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { removeVietnameseTones, injectSynonyms } from '@/lib/searchCache';
import Fuse from 'fuse.js';

export async function GET(request: Request) {
 try {
 const { searchParams } = new URL(request.url);
 const q = searchParams.get('q') || 'lap';

 // Load products fresh same as cache
 const [rows] = await pool.query<{ id: number; storeSKU: string; proName: string }>(`
 SELECT p.id, p.storeSKU, p.proName FROM idv_sell_product_store p WHERE p.id > 0 LIMIT 50000
 `);

 const total = rows.length;
 const products = rows.map(row => {
 const rawText = `${row.storeSKU || ''} ${row.proName || ''}`.trim();
 const normalized = removeVietnameseTones(rawText);
 const searchText = injectSynonyms(normalized);
 return { id: row.id, storeSKU: row.storeSKU || '', proName: row.proName || '', searchText, normalizedName: normalized };
 });

 const normalizedQuery = removeVietnameseTones(q);
 const tokens = normalizedQuery.split(' ').filter(Boolean);

 if (tokens.length === 0) {
 return NextResponse.json({ error: 'empty query', totalProducts: total });
 }

 // Test Fuse with simple query
 const simpleOptions = { keys: ['searchText'] as const, threshold: 0.3, includeScore: true, distance: 200, ignoreLocation: true };
 const fuse = new Fuse(products, simpleOptions);
 const raw = fuse.search(normalizedQuery);

 let filtered = raw.filter(r => (r.score ?? 1) < 0.4);

 // Check if "lap" appears in any product text
 const lapHits = products.filter(p => p.searchText.includes('lap')).slice(0, 5).map(p => ({
 id: p.id,
 proName: p.proName.substring(0, 50),
 searchText: p.searchText.substring(0, 60),
 }));

 return NextResponse.json({
 query: q,
 normalizedQuery,
 tokens,
 totalProducts: total,
 fuseTotalRaw: raw.length,
 fuseTotalFiltered: filtered.length,
 lapInText: lapHits.length,
 sampleLapHits: lapHits,
 topResults: filtered.slice(0, 5).map(r => ({
 id: r.item.id,
 name: r.item.proName?.substring(0, 50),
 score: r.score?.toFixed(4),
 searchText: r.item.searchText?.substring(0, 60),
 })),
 fuseVersion: Fuse.version,
 });
 } catch (err) {
 return NextResponse.json({ error: err instanceof Error ? err.message : String(err), stack: (err as any)?.stack });
 }
}
