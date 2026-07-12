import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const PRODUCT_ID = Number(__ENV.PRODUCT_ID || 1);
const orderErrors = new Counter('order_errors');

export const options = {
  scenarios: {
    browse: { executor: 'ramping-vus', exec: 'browse', startVUs: 0, stages: [{ duration: '10m', target: 1200 }, { duration: '30m', target: 1200 }, { duration: '3m', target: 0 }] },
    search: { executor: 'ramping-vus', exec: 'search', startVUs: 0, stages: [{ duration: '10m', target: 225 }, { duration: '30m', target: 225 }, { duration: '3m', target: 0 }] },
    account: { executor: 'ramping-vus', exec: 'account', startVUs: 0, stages: [{ duration: '10m', target: 75 }, { duration: '30m', target: 75 }, { duration: '3m', target: 0 }] },
    checkout: { executor: 'constant-arrival-rate', exec: 'checkout', rate: 10, timeUnit: '1s', duration: '30m', preAllocatedVUs: 30, maxVUs: 100, startTime: '10m' },
  },
  thresholds: {
    http_req_failed: ['rate<0.005'], http_req_duration: ['p(95)<300', 'p(99)<800'],
    'http_req_duration{flow:quote}': ['p(95)<500'], 'http_req_duration{flow:order}': ['p(95)<1500'], order_errors: ['count==0'],
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
  check(response, { 'search 200': (value) => value.status === 200 }); sleep(5 + Math.random() * 5);
}

export function account() {
  const response = http.get(`${BASE_URL}/api/customer/me`, { tags: { flow: 'account' } });
  check(response, { 'account handled': (value) => value.status === 200 || value.status === 401 }); sleep(10);
}

export function checkout() {
  const items = [{ productId: PRODUCT_ID, quantity: 1 }];
  const origin = __ENV.STOREFRONT_ORIGIN || 'http://localhost:3001';
  const quote = http.post(`${BASE_URL}/api/cart/quote`, JSON.stringify({ items, voucherCode: '' }), { headers: { 'Content-Type': 'application/json', Origin: origin }, tags: { flow: 'quote' } });
  if (!check(quote, { 'quote 200': (value) => value.status === 200 })) { orderErrors.add(1); return; }
  if (__ENV.ENABLE_ORDER_LOAD !== 'true') return;
  const key = `k6-${__VU}-${__ITER}-${Date.now()}`;
  const phone = `09${String(__VU % 100000000).padStart(8, '0')}`;
  const payload = { items, voucherCode: '', recaptchaToken: 'load-test-bypass', website: '', customer: { name: 'Load Test', phone, email: '' }, receiver: {}, delivery: { method: 'pickup', province: '', ward: '', address: '', note: '' }, paymentMethod: 'bank_transfer', invoice: {}, note: '' };
  const order = http.post(`${BASE_URL}/api/orders`, JSON.stringify(payload), { headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, Origin: origin }, tags: { flow: 'order' } });
  if (!check(order, { 'order 200': (value) => value.status === 200 })) orderErrors.add(1);
}
