export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return;
  const { beginRuntimePrewarm, completeRuntimePrewarm } = await import('@/lib/runtimeReadiness');
  beginRuntimePrewarm();
  const results = await Promise.allSettled([
    import('@/lib/searchLexicalCache').then(({ rankLexicalSearch }) => rankLexicalSearch('laptop')),
    import('@/lib/publicMenus').then(({ getPublishedMenuBundle }) => getPublishedMenuBundle()),
  ]);
  const failed = results.find((result) => result.status === 'rejected');
  if (failed?.status === 'rejected') console.error('[prewarm]', failed.reason);
  completeRuntimePrewarm(failed?.status === 'rejected' ? failed.reason : undefined);
}
