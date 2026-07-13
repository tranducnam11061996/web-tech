import assert from 'node:assert/strict';
import test from 'node:test';
import { jsonWithEtag } from '../src/lib/httpCache';

test('jsonWithEtag returns a stable validator and honors If-None-Match', async () => {
  const body = { success: true, data: { id: 1 } };
  const first = jsonWithEtag(new Request('http://localhost/test'), body);
  const etag = first.headers.get('etag');
  assert.equal(first.status, 200);
  assert.ok(etag);
  assert.deepEqual(await first.json(), body);

  const conditional = jsonWithEtag(new Request('http://localhost/test', { headers: { 'If-None-Match': etag! } }), body);
  assert.equal(conditional.status, 304);
  assert.equal(await conditional.text(), '');
});
