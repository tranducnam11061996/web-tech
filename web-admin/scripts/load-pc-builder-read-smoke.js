import http from 'k6/http';
import { check, sleep } from 'k6';

const API_BASE = (__ENV.API_BASE || 'http://localhost:3000').replace(/\/$/, '');
const STOREFRONT_BASE = (__ENV.STOREFRONT_BASE || 'http://localhost:3001').replace(/\/$/, '');
const VUS = Math.max(1, Number(__ENV.VUS || 3));
const DURATION = __ENV.DURATION || '15s';

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
  },
};

const headers = {
  'Content-Type': 'application/json',
  Origin: STOREFRONT_BASE,
};

export default function () {
  const responses = http.batch([
    ['GET', `${API_BASE}/api/pc-builder/bootstrap`, null, { headers, tags: { flow: 'pc-builder-bootstrap' } }],
    ['GET', `${STOREFRONT_BASE}/xay-dung-cau-hinh-pc`, null, { tags: { flow: 'pc-builder-page' } }],
    [
      'POST',
      `${API_BASE}/api/pc-builder/candidates`,
      JSON.stringify({ componentCode: 'cpu', selections: [], cursor: 0, limit: 5, query: '', brandIds: [] }),
      { headers, tags: { flow: 'pc-builder-candidates' } },
    ],
  ]);

  check(responses[0], { 'bootstrap 200': (response) => response.status === 200 });
  check(responses[1], { 'builder page 200': (response) => response.status === 200 });
  check(responses[2], { 'candidate read 200': (response) => response.status === 200 });
  sleep(1);
}
