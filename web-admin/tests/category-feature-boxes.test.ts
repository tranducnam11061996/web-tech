import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isCategoryFeatureBoxEnabledForScope,
  normalizeCategoryFeatureBoxInput,
  normalizeCategoryFeatureColor,
  normalizeCategoryFeatureHeadline,
} from '../src/lib/categoryFeatureBoxes';

test('normalizes category feature colors and uses a safe fallback', () => {
  assert.equal(normalizeCategoryFeatureColor('#A17C45', '#0f0f14'), '#a17c45');
  assert.equal(normalizeCategoryFeatureColor('7040a0', '#0f0f14'), '#7040a0');
  assert.equal(normalizeCategoryFeatureColor('linear-gradient(red, blue)', '#0f0f14'), '#0f0f14');
});

test('preserves one manual headline break and rejects more than two lines', () => {
  assert.equal(normalizeCategoryFeatureHeadline('LAPTOP\r\nDEALS'), 'LAPTOP\nDEALS');
  assert.throws(
    () => normalizeCategoryFeatureHeadline('ONE\nTWO\nTHREE'),
    (error: any) => error?.code === 'BAD_REQUEST' && error?.fields?.['featureBox.headline'] === 'max_lines',
  );
  assert.throws(
    () => normalizeCategoryFeatureHeadline('X'.repeat(256)),
    (error: any) => error?.code === 'BAD_REQUEST' && error?.fields?.['featureBox.headline'] === 'max_length',
  );
});

test('derives the feature target from the category and ignores a client URL override', () => {
  const featureBox = normalizeCategoryFeatureBoxInput(472, {
    homepageEnabled: true,
    categoryPageEnabled: true,
    backgroundImageUrl: 'category/hero.jpg',
    targetUrl: 'https://example.com/should-not-be-used',
    headline: 'PC\nDEALS',
    containerBackgroundColor: '#7040a0',
  }, '/bo-pc-gaming-livestream.html');

  assert.equal(featureBox.targetUrl, '/bo-pc-gaming-livestream.html');
  assert.equal(featureBox.categoryPageEnabled, true);
  assert.equal(featureBox.headline, 'PC\nDEALS');
  assert.equal(featureBox.containerBackgroundColor, '#7040a0');
});

test('configured category reads reuse a homepage box without changing the stored category-page flag', () => {
  const featureBox = normalizeCategoryFeatureBoxInput(472, {
    homepageEnabled: true,
    categoryPageEnabled: false,
    backgroundImageUrl: 'category/hero.jpg',
  }, '/bo-pc-gaming-livestream.html');

  assert.equal(isCategoryFeatureBoxEnabledForScope(featureBox, 'homepage'), true);
  assert.equal(isCategoryFeatureBoxEnabledForScope(featureBox, 'category'), false);
  assert.equal(isCategoryFeatureBoxEnabledForScope(featureBox, 'configured'), true);
  assert.equal(featureBox.categoryPageEnabled, false);
});
