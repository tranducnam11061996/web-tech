import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ORIGIN = __ENV.STOREFRONT_ORIGIN || 'http://localhost:3001';
const PRODUCT_ID = Number(__ENV.PRODUCT_ID || 1);

export const options = {
  scenarios: {
    abuse: { executor: 'shared-iterations', vus: 1, iterations: Number(__ENV.ABUSE_ITERATIONS || 140), maxDuration: '5m' },
  },
  thresholds: { checks: ['rate>0.99'] },
};

export default function () {
  const response = http.post(`${BASE_URL}/api/cart/quote`, JSON.stringify({ items: [{ productId: PRODUCT_ID, quantity: 1 }] }), {
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
  });
  check(response, {
    'quote accepted or rate limited safely': (value) => value.status === 200 || (value.status === 429 && Number(value.headers['Retry-After'] || 0) > 0),
  });
}
