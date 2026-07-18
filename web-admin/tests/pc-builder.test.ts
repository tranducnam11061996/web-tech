import assert from 'node:assert/strict';
import test from 'node:test';
import { pcBuilderAutoRequestSchema, pcBuilderQuoteRequestSchema } from '../src/lib/pcBuilder/types';
import { evaluatePcBuilderCompatibility } from '../src/lib/pcBuilder/service';
import { extractPcBuilderSuggestions, pcBuilderSourceHash } from '../src/lib/pcBuilder/admin';
import type { PcBuilderFact } from '../src/lib/pcBuilder/types';

const rule = (overrides: Record<string, unknown>) => ({
  code: 'test', severity: 'error', operator: 'equality', left_component: 'cpu', left_fact: 'attr:socket',
  right_component: 'mainboard', right_fact: 'attr:socket', message: 'Không tương thích', revision: 'v1', ...overrides,
}) as any;

test('hard-blocks a known CPU and mainboard socket mismatch', () => {
  const facts: PcBuilderFact[] = [
    { productId: 1, componentCode: 'cpu' as const, attributes: { socket: ['am5'] }, metrics: {} },
    { productId: 2, componentCode: 'mainboard' as const, attributes: { socket: ['lga1700'] }, metrics: {} },
  ];
  const diagnostics = evaluatePcBuilderCompatibility(facts, [rule({})], [
    { componentCode: 'cpu', productId: 1, quantity: 1 }, { componentCode: 'mainboard', productId: 2, quantity: 1 },
  ]);
  assert.ok(diagnostics.some((item) => item.ruleCode === 'test' && item.severity === 'error'));
});

test('accepts overlapping socket sets and blocks VGA dimensions over case limit', () => {
  const facts: PcBuilderFact[] = [
    { productId: 1, componentCode: 'cpu' as const, attributes: { socket: ['am5'] }, metrics: {} },
    { productId: 2, componentCode: 'mainboard' as const, attributes: { socket: ['am5'] }, metrics: {} },
    { productId: 3, componentCode: 'gpu' as const, attributes: {}, metrics: { gpu_length_mm: 340 } },
    { productId: 4, componentCode: 'case' as const, attributes: {}, metrics: { case_max_gpu_length_mm: 320 } },
  ];
  const rules = [rule({}), rule({ code: 'gpu_case_length', operator: 'numeric_lte', left_component: 'gpu', left_fact: 'metric:gpu_length_mm', right_component: 'case', right_fact: 'metric:case_max_gpu_length_mm' })];
  const diagnostics = evaluatePcBuilderCompatibility(facts, rules, facts.map((fact) => ({ componentCode: fact.componentCode, productId: fact.productId, quantity: 1 })));
  assert.equal(diagnostics.some((item) => item.ruleCode === 'test'), false);
  assert.equal(diagnostics.some((item) => item.ruleCode === 'gpu_case_length'), true);
});

test('requires confirmation warning when no verified display path exists', () => {
  const facts: PcBuilderFact[] = [
    { productId: 1, componentCode: 'cpu' as const, attributes: {}, metrics: { cpu_has_igpu: false } },
    { productId: 2, componentCode: 'mainboard' as const, attributes: {}, metrics: { main_has_video_output: true } },
  ];
  const diagnostics = evaluatePcBuilderCompatibility(facts, [], facts.map((fact) => ({ componentCode: fact.componentCode, productId: fact.productId, quantity: 1 })));
  assert.ok(diagnostics.some((item) => item.ruleCode === 'display_output_unverified' && item.severity === 'warning'));
});

test('parser extracts typed RAM, storage, PSU and mainboard metrics', () => {
  assert.deepEqual(extractPcBuilderSuggestions('ram', { name: 'RAM DDR5 32GB (2x16GB)' }).metrics, { ram_capacity_gb: 32, ram_modules_per_kit: 2 });
  assert.equal(extractPcBuilderSuggestions('storage', { name: 'SSD NVMe 1TB' }).metrics.storage_capacity_gb, 1000);
  assert.equal(extractPcBuilderSuggestions('psu', { spec: 'Công suất thực: 750W' }).metrics.psu_output_w, 750);
  assert.equal(extractPcBuilderSuggestions('mainboard', { spec: '4 khe RAM, 2 x M.2, HDMI' }).metrics.main_has_video_output, true);
});

test('public schemas reject unbounded and non-canonical requests', () => {
  assert.equal(pcBuilderQuoteRequestSchema.safeParse({ selections: [{ componentCode: 'cpu', productId: 1, quantity: 5 }] }).success, false);
  assert.equal(pcBuilderAutoRequestSchema.safeParse({ budget: 25_000_000, resolution: '8k', gameType: 'mixed' }).success, false);
  assert.equal(pcBuilderAutoRequestSchema.safeParse({ budget: 25_000_000, resolution: '1440p', gameType: 'mixed' }).success, true);
});

test('source hash is stable and changes for compatibility-relevant catalog input', () => {
  const base = { proName: 'CPU A', proSummary: 'Socket AM5', spec: '<p>DDR5</p>', category_ids: '47,48', attribute_values: '12:90' };
  assert.equal(pcBuilderSourceHash(base as any), pcBuilderSourceHash({ ...base } as any));
  assert.notEqual(pcBuilderSourceHash(base as any), pcBuilderSourceHash({ ...base, attribute_values: '12:91' } as any));
  assert.notEqual(pcBuilderSourceHash(base as any), pcBuilderSourceHash({ ...base, spec: '<p>DDR4</p>' } as any));
});
