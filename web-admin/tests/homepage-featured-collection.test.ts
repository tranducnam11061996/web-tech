import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildHomepageBootstrapCacheKey,
  parseHomepageFeaturedCollectionRequest,
} from '../src/lib/homepageFeaturedCollection';

test('parses a bounded homepage featured collection request', () => {
  const params = new URLSearchParams({
    collectionId: '896',
    collectionSlug: 'goi-y-cho-ban',
    collectionLimit: '10',
  });

  assert.deepEqual(parseHomepageFeaturedCollectionRequest(params), {
    collectionId: 896,
    collectionSlug: 'goi-y-cho-ban',
    collectionLimit: 10,
  });
});

test('clamps homepage collection limits and rejects unsafe identity values', () => {
  const clamped = parseHomepageFeaturedCollectionRequest(new URLSearchParams({
    collectionId: '896',
    collectionSlug: 'goi-y-cho-ban',
    collectionLimit: '999',
  }));
  assert.equal(clamped?.collectionLimit, 24);

  assert.equal(parseHomepageFeaturedCollectionRequest(new URLSearchParams({
    collectionId: '0',
    collectionSlug: 'goi-y-cho-ban',
    collectionLimit: '10',
  })), null);
  assert.equal(parseHomepageFeaturedCollectionRequest(new URLSearchParams({
    collectionId: '896',
    collectionSlug: '../goi-y-cho-ban',
    collectionLimit: '10',
  })), null);
});

test('varies the homepage bootstrap cache key by collection identity and limit', () => {
  const request = {
    collectionId: 896,
    collectionSlug: 'goi-y-cho-ban',
    collectionLimit: 10,
  };

  assert.equal(
    buildHomepageBootstrapCacheKey(request),
    'homepage:bootstrap:v3:collection:896:goi-y-cho-ban:10',
  );
  assert.notEqual(
    buildHomepageBootstrapCacheKey(request),
    buildHomepageBootstrapCacheKey({ ...request, collectionLimit: 8 }),
  );
  assert.equal(
    buildHomepageBootstrapCacheKey(null),
    'homepage:bootstrap:v3:no-featured-collection',
  );
});
