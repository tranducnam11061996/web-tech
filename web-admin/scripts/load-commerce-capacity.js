import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ORIGIN = __ENV.STOREFRONT_ORIGIN || 'http://localhost:3001';
const PRODUCT_ID = Number(__ENV.PRODUCT_ID || 1);
const orderErrors = new Counter('order_errors');

export const options = {
  scenarios: {
    quote: { executor: 'constant-arrival-rate', exec: 'quote', rate: 40, timeUnit: '1s', duration: '30m', preAllocatedVUs: 50, maxVUs: 200 },
    order: { executor: 'constant-arrival-rate', exec: 'order', rate: 10, timeUnit: '1s', duration: '30m', preAllocatedVUs: 30, maxVUs: 150 },
  },
  thresholds: {
    http_req_failed: ['rate<0.005'],
    'http_req_duration{flow:quote}': ['p(95)<500'],
    'http_req_duration{flow:order}': ['p(95)<1500'],
    order_errors: ['count==0'],
  },
};

const headers = { 'Content-Type': 'application/json', Origin: ORIGIN };
const items = [{ productId: PRODUCT_ID, quantity: 1 }];

export function quote() {
  const response = http.post(`${BASE_URL}/api/cart/quote`, JSON.stringify({ items, voucherCode: '' }), { headers, tags: { flow: 'quote' } });
  check(response, { 'quote 200': (value) => value.status === 200 });
}

export function order() {
  if (__ENV.ENABLE_ORDER_LOAD !== 'true') return;
  const unique = ((__VU * 100000) + __ITER) % 100000000;
  const phone = `09${String(unique).padStart(8, '0')}`;
  const key = `k6-${__VU}-${__ITER}-${Date.now()}`;
  const payload = { items, voucherCode: '', recaptchaToken: 'load-test-shadow', website: '', customer: { name: 'Load Test', phone, email: '' }, receiver: {}, delivery: { method: 'pickup', province: '', ward: '', address: '', note: '' }, paymentMethod: 'bank_transfer', invoice: {}, note: '' };
  const response = http.post(`${BASE_URL}/api/orders`, JSON.stringify(payload), { headers: { ...headers, 'Idempotency-Key': key }, tags: { flow: 'order' } });
  if (!check(response, { 'order 200': (value) => value.status === 200 })) orderErrors.add(1);
}
