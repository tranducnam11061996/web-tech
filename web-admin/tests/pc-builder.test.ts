import assert from "node:assert/strict";
import test from "node:test";
import {
  pcBuilderCandidateRequestSchema,
  pcBuilderQuoteRequestSchema,
  type PcBuilderFact,
} from "../src/lib/pcBuilder/types";
import { evaluatePcBuilderCompatibility } from "../src/lib/pcBuilder/service";
import { isPcBuilderRelationEnforceable } from "../src/lib/pcBuilder/configuration";
import {
  canonicalHardwareModel,
  exactHardwareModelMatch,
  normalizeBenchmarkScores,
} from "../src/lib/pcBuilder/benchmark";

const rule = (overrides: Record<string, unknown> = {}) =>
  ({
    code: "socket_relation",
    severity: "error",
    operator: "equality",
    left_component: "cpu",
    left_fact: "attr:socket",
    right_component: "mainboard",
    right_fact: "attr:socket",
    message: "Socket không tương thích",
    revision: "v4",
    ...overrides,
  }) as any;

const selectionFor = (fact: PcBuilderFact) => ({
  componentCode: fact.componentCode,
  productId: fact.productId,
  quantity: 1,
});

test("attribute relation accepts an overlap and hard-blocks a mismatch", () => {
  const compatible: PcBuilderFact[] = [
    { productId: 1, componentCode: "cpu", attributes: { socket: ["90"] }, metrics: {} },
    { productId: 2, componentCode: "mainboard", attributes: { socket: ["90", "91"] }, metrics: {} },
  ];
  assert.equal(
    evaluatePcBuilderCompatibility(compatible, [rule()], compatible.map(selectionFor)).some((item) => item.severity === "error"),
    false,
  );
  const mismatch = compatible.map((fact) =>
    fact.componentCode === "mainboard" ? { ...fact, attributes: { socket: ["92"] } } : fact,
  );
  assert.ok(
    evaluatePcBuilderCompatibility(mismatch, [rule()], mismatch.map(selectionFor)).some(
      (item) => item.ruleCode === "socket_relation" && item.severity === "error",
    ),
  );
});

test("active relation hard-blocks missing reference attributes", () => {
  const facts: PcBuilderFact[] = [
    { productId: 1, componentCode: "cpu", attributes: {}, metrics: {} },
    { productId: 2, componentCode: "mainboard", attributes: { socket: ["90"] }, metrics: {} },
  ];
  assert.ok(
    evaluatePcBuilderCompatibility(facts, [rule()], facts.map(selectionFor)).some(
      (item) => item.ruleCode === "socket_relation_missing_attribute" && item.severity === "error",
    ),
  );
});

test("dynamic required components are warnings and SKU limits remain independent", () => {
  const components = [
    { code: "cpu", name: "CPU", categoryId: 47, required: true, minSelections: 1, maxSelections: 1, ordering: 1, status: true },
    { code: "ssd", name: "SSD", categoryId: 139, required: true, minSelections: 1, maxSelections: 2, ordering: 2, status: true },
    { code: "hdd", name: "HDD", categoryId: 143, required: false, minSelections: 0, maxSelections: 1, ordering: 3, status: true },
  ];
  const selections = [
    { componentCode: "cpu", productId: 1, quantity: 1 },
    { componentCode: "hdd", productId: 2, quantity: 1 },
    { componentCode: "hdd", productId: 3, quantity: 1 },
  ];
  const diagnostics = evaluatePcBuilderCompatibility([], [], selections, { components });
  assert.ok(diagnostics.some((item) => item.ruleCode === "missing_required_ssd" && item.severity === "warning"));
  assert.ok(diagnostics.some((item) => item.ruleCode === "hdd_selection_limit" && item.severity === "error"));
  assert.equal(diagnostics.some((item) => item.ruleCode === "cpu_selection_limit"), false);
});

test("candidate schema uses stable numeric attribute value IDs and bounded filters", () => {
  assert.equal(
    pcBuilderCandidateRequestSchema.safeParse({
      componentCode: "cpu",
      attributeFilters: { "12": [90, 91] },
    }).success,
    true,
  );
  assert.equal(
    pcBuilderCandidateRequestSchema.safeParse({
      componentCode: "cpu",
      attributeFilters: { socket: ["AM5"] },
    }).success,
    false,
  );
  assert.equal(
    pcBuilderQuoteRequestSchema.safeParse({ selections: [{ componentCode: "cpu", productId: 1, quantity: 5 }] }).success,
    false,
  );
});

test("relation filtering requires at least 90 percent attribute coverage on both category trees", () => {
  assert.equal(
    isPcBuilderRelationEnforceable({
      sourceProductCount: 112,
      sourceAttributeProductCount: 110,
      relatedProductCount: 255,
      relatedAttributeProductCount: 251,
    }),
    true,
  );
  assert.equal(
    isPcBuilderRelationEnforceable({
      sourceProductCount: 255,
      sourceAttributeProductCount: 1,
      relatedProductCount: 30,
      relatedAttributeProductCount: 30,
    }),
    false,
  );
  assert.equal(
    isPcBuilderRelationEnforceable({
      sourceProductCount: 10,
      sourceAttributeProductCount: 9,
      relatedProductCount: 10,
      relatedAttributeProductCount: 9,
    }),
    true,
  );
});

test("benchmark data helpers remain independent from catalog-live", () => {
  assert.equal(canonicalHardwareModel("AMD Ryzen 7 7800X3D Processor"), "amd ryzen 7 7800x3d");
  assert.equal(exactHardwareModelMatch("GeForce RTX 4070 SUPER 12GB", "GeForce RTX 4070 Super 12GB"), true);
  assert.equal(exactHardwareModelMatch("GeForce RTX 4070 12GB", "GeForce RTX 4070 Super 12GB"), false);
  const normalized = normalizeBenchmarkScores([
    { productId: 1, canonicalModel: "CPU A", rawScore: 85.55, rawUnit: "index_percent", sourceCode: "cpu-2026-a", sourceUrl: "https://example.test/cpu", snapshotAt: "2026-07-19T00:00:00.000Z" },
    { productId: 2, canonicalModel: "CPU B", rawScore: 71.23, rawUnit: "index_percent", sourceCode: "cpu-2026-a", sourceUrl: "https://example.test/cpu", snapshotAt: "2026-07-19T00:00:00.000Z" },
  ]);
  assert.equal(normalized[0]?.normalizedScore, 100);
  assert.equal(normalized[1]?.normalizedScore, 83.26);
});
