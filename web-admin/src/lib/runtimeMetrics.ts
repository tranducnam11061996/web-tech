type RouteMetric = {
  count: number;
  errors: number;
  totalMs: number;
  maxMs: number;
  lastMs: number;
};

const routeMetrics = new Map<string, RouteMetric>();
const startedAt = Date.now();

export function recordRouteMetric(route: string, durationMs: number, status: number) {
  const key = route.replace(/[^a-z0-9:_/-]/gi, '').slice(0, 100) || 'unknown';
  const current = routeMetrics.get(key) || { count: 0, errors: 0, totalMs: 0, maxMs: 0, lastMs: 0 };
  current.count += 1;
  current.errors += status >= 500 ? 1 : 0;
  current.totalMs += durationMs;
  current.maxMs = Math.max(current.maxMs, durationMs);
  current.lastMs = durationMs;
  routeMetrics.set(key, current);
}

export function getRuntimeMetricsSnapshot() {
  const memory = process.memoryUsage();
  return {
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1_000),
    process: {
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      externalBytes: memory.external,
    },
    routes: Object.fromEntries(Array.from(routeMetrics.entries()).map(([key, value]) => [key, {
      count: value.count,
      errors: value.errors,
      averageMs: value.count ? Math.round((value.totalMs / value.count) * 10) / 10 : 0,
      maxMs: Math.round(value.maxMs * 10) / 10,
      lastMs: Math.round(value.lastMs * 10) / 10,
    }])),
  };
}
