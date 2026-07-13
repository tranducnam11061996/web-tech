const base = (process.env.LIGHTHOUSE_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const urls = [`${base}/`, `${base}/tim?q=ban%20phim`, `${base}/gio-hang`, `${base}/thanh-toan`];
if (process.env.LIGHTHOUSE_PRODUCT_SLUG) urls.push(`${base}/${encodeURIComponent(process.env.LIGHTHOUSE_PRODUCT_SLUG)}`);

module.exports = {
  ci: {
    collect: { url: urls, numberOfRuns: 3, settings: { preset: 'desktop' } },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
      },
    },
    upload: { target: 'filesystem', outputDir: './artifacts/lighthouse' },
  },
};
