export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return;
  setTimeout(() => {
    void import('@/lib/searchLexicalCache').then(({ rankLexicalSearch }) => rankLexicalSearch('laptop')).catch((error) => console.error('[prewarm:search]', error));
    void import('@/lib/publicMenus').then(({ getPublishedMenuBundle }) => getPublishedMenuBundle()).catch((error) => console.error('[prewarm:menu]', error));
  }, 1_000);
}
