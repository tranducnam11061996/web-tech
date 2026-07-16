import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ORIGIN = __ENV.STOREFRONT_ORIGIN || 'http://localhost:3001';
const PRODUCT_ID = Number(__ENV.PRODUCT_ID || 1);
const PAGE_VIEW_PATH = __ENV.PAGE_VIEW_PATH || '';

export const options = {
  scenarios: {
    quote_abuse: { executor: 'shared-iterations', exec: 'quoteAbuse', vus: 1, iterations: Number(__ENV.ABUSE_ITERATIONS || 140), maxDuration: '5m' },
    ...(PAGE_VIEW_PATH ? {
      page_view_abuse: { executor: 'shared-iterations', exec: 'pageViewAbuse', vus: 1, iterations: Number(__ENV.PAGE_VIEW_ABUSE_ITERATIONS || 140), maxDuration: '5m' },
    } : {}),
  },
  thresholds: { checks: ['rate>0.99'] },
};

function uuidV4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function quoteAbuse() {
  const response = http.post(`${BASE_URL}/api/cart/quote`, JSON.stringify({ items: [{ productId: PRODUCT_ID, quantity: 1 }] }), {
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
  });
  check(response, {
    'quote accepted or rate limited safely': (value) => value.status === 200 || (value.status === 429 && Number(value.headers['Retry-After'] || 0) > 0),
  });
}

export function pageViewAbuse() {
  const response = http.post(`${BASE_URL}/api/page-views`, JSON.stringify({ eventId: uuidV4(), path: PAGE_VIEW_PATH }), {
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      Referer: `${ORIGIN}${PAGE_VIEW_PATH}`,
      'Sec-Fetch-Site': 'same-origin',
    },
  });
  check(response, {
    'page view accepted or rate limited safely': (value) => value.status === 202 || (value.status === 429 && Number(value.headers['Retry-After'] || 0) > 0),
  });
}

export default quoteAbuse;
