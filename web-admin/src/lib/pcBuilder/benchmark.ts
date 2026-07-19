import { createHash } from 'crypto';

export type BenchmarkScoreInput = {
  productId: number;
  canonicalModel: string;
  rawScore: number;
  rawUnit: string;
  sourceCode: string;
  sourceUrl: string;
  snapshotAt: string;
  evidence?: Record<string, unknown>;
};

export function canonicalHardwareModel(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[™®©]/g, '')
    .replace(/\b(?:processor|graphics|card|cpu|gpu)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function exactHardwareModelMatch(catalogModel: string, benchmarkModel: string) {
  return canonicalHardwareModel(catalogModel) === canonicalHardwareModel(benchmarkModel);
}

export function normalizeBenchmarkScores(rows: BenchmarkScoreInput[]) {
  if (!rows.length) return [];
  const sourceCodes = new Set(rows.map((row) => row.sourceCode));
  if (sourceCodes.size !== 1) throw new Error('Benchmark rows from different cohorts cannot be normalized together.');
  const maximum = Math.max(...rows.map((row) => Number(row.rawScore)));
  if (!Number.isFinite(maximum) || maximum <= 0) throw new Error('Benchmark cohort must contain a positive maximum score.');
  return rows.map((row) => ({
    ...row,
    normalizedScore: Math.round((Number(row.rawScore) / maximum) * 10_000) / 100,
    evidenceHash: createHash('sha256').update(JSON.stringify({
      canonicalModel: canonicalHardwareModel(row.canonicalModel), rawScore: row.rawScore, rawUnit: row.rawUnit,
      sourceCode: row.sourceCode, sourceUrl: row.sourceUrl, snapshotAt: row.snapshotAt, evidence: row.evidence || {},
    })).digest('hex'),
  }));
}
