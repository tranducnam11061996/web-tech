import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const PRODUCT_SLUG = __ENV.PRODUCT_SLUG || '';

export const options = {
  scenarios: {
    browse: { executor: 'ramping-vus', startVUs: 0, stages: [{ duration: '10m', target: 1200 }, { duration: '30m', target: 1200 }, { duration: '3m', target: 0 }] },
    search: { executor: 'ramping-vus', startVUs: 0, stages: [{ duration: '10m', target: 225 }, { duration: '30m', target: 225 }, { duration: '3m', target: 0 }] },
    detail: { executor: 'ramping-vus', startVUs: 0, stages: [{ duration: '10m', target: 75 }, { duration: '30m', target: 75 }, { duration: '3m', target: 0 }] },
  },
  thresholds: {
    http_req_failed: ['rate<0.005'],
    http_req_duration: ['p(95)<300', 'p(99)<800'],
  },
};

export function browse() {
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/homepage/bootstrap`, null, { tags: { flow: 'read' } }],
    ['GET', `${BASE_URL}/api/products?limit=24&page=1`, null, { tags: { flow: 'read' } }],
  ]);
  responses.forEach((response) => check(response, { 'browse 200': (value) => value.status === 200 }));
  sleep(8 + Math.random() * 8);
}

export function search() {
  const response = http.get(`${BASE_URL}/api/search?q=ban%20phim&limit=24&page=1`, { tags: { flow: 'search' } });
  check(response, { 'search 200': (value) => value.status === 200 });
  sleep(5 + Math.random() * 5);
}

export function detail() {
  if (!PRODUCT_SLUG) { sleep(10); return; }
  const core = http.get(`${BASE_URL}/api/products/${encodeURIComponent(PRODUCT_SLUG)}?include=core`, { tags: { flow: 'detail-core' } });
  check(core, { 'detail core 200': (value) => value.status === 200 });
  if (Math.random() < 0.35) {
    const supplemental = http.get(`${BASE_URL}/api/products/${encodeURIComponent(PRODUCT_SLUG)}/supplemental`, { tags: { flow: 'detail-supplemental' } });
    check(supplemental, { 'detail supplemental 200': (value) => value.status === 200 });
  }
  sleep(8 + Math.random() * 8);
}
