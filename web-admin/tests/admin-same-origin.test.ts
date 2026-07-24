import assert from 'node:assert/strict';
import test from 'node:test';
import { isSameAdminOrigin } from '../src/lib/admin/sameOrigin';

function withNextAuthUrl(value: string | undefined, callback: () => void) {
  const previous = process.env.NEXTAUTH_URL;
  if (value === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = value;
  try {
    callback();
  } finally {
    if (previous === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = previous;
  }
}

test('accepts the configured public admin origin behind an internal reverse proxy URL', () => {
  withNextAuthUrl('https://admin.tructiepgame.vn', () => {
    const request = new Request('http://127.0.0.1:3000/api/admin/auth/login', {
      headers: { origin: 'https://admin.tructiepgame.vn' },
    });
    assert.equal(isSameAdminOrigin(request), true);
  });
});

test('rejects a different origin even when the request is behind the same proxy', () => {
  withNextAuthUrl('https://admin.tructiepgame.vn/', () => {
    const request = new Request('http://127.0.0.1:3000/api/admin/auth/login', {
      headers: { origin: 'https://tructiepgame.vn' },
    });
    assert.equal(isSameAdminOrigin(request), false);
  });
});

test('rejects requests without an Origin header', () => {
  withNextAuthUrl('https://admin.tructiepgame.vn', () => {
    const request = new Request('http://127.0.0.1:3000/api/admin/auth/login');
    assert.equal(isSameAdminOrigin(request), false);
  });
});

test('falls back to the request URL origin when NEXTAUTH_URL is not configured', () => {
  withNextAuthUrl(undefined, () => {
    const request = new Request('http://localhost:3000/api/admin/auth/login', {
      headers: { origin: 'http://localhost:3000' },
    });
    assert.equal(isSameAdminOrigin(request), true);
  });
});
