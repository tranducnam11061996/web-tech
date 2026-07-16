import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ORIGIN = __ENV.STOREFRONT_ORIGIN || 'http://localhost:3001';
const PAGE_VIEW_PATH = __ENV.PAGE_VIEW_PATH || '';

export const options = {
  scenarios: {
    page_views: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.PAGE_VIEW_RATE || 150),
      timeUnit: '1s',
      duration: __ENV.PAGE_VIEW_DURATION || '5m',
      preAllocatedVUs: Number(__ENV.PAGE_VIEW_PREALLOCATED_VUS || 100),
      maxVUs: Number(__ENV.PAGE_VIEW_MAX_VUS || 400),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.005'],
    http_req_duration: ['p(95)<300', 'p(99)<800'],
    checks: ['rate>0.995'],
  },
};

function uuidV4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function setup() {
  if (!PAGE_VIEW_PATH.startsWith('/')) throw new Error('PAGE_VIEW_PATH is required for the page-view capacity scenario');
}

export default function () {
  const response = http.post(`${BASE_URL}/api/page-views`, JSON.stringify({ eventId: uuidV4(), path: PAGE_VIEW_PATH }), {
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      Referer: `${ORIGIN}${PAGE_VIEW_PATH}`,
      'Sec-Fetch-Site': 'same-origin',
    },
    tags: { flow: 'page-view' },
  });
  check(response, { 'page view accepted': (value) => value.status === 202 });
}
