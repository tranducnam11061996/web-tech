import { z } from 'zod';

export const PC_BUILDER_COMPONENT_CODES = [
  'cpu', 'mainboard', 'ram', 'storage', 'case', 'psu', 'gpu',
  'monitor', 'keyboard', 'mouse', 'headset', 'cooler',
] as const;

export type PcBuilderComponentCode = (typeof PC_BUILDER_COMPONENT_CODES)[number];

export const pcBuilderSelectionSchema = z.object({
  componentCode: z.enum(PC_BUILDER_COMPONENT_CODES),
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(4),
}).strict();

export const pcBuilderSelectionsSchema = z.array(pcBuilderSelectionSchema).max(24);

export const pcBuilderQuoteRequestSchema = z.object({
  selections: pcBuilderSelectionsSchema,
  assemblyRequired: z.boolean().optional().default(true),
}).strict();

export const pcBuilderCandidateRequestSchema = z.object({
  componentCode: z.enum(PC_BUILDER_COMPONENT_CODES),
  selections: pcBuilderSelectionsSchema.optional().default([]),
  cursor: z.coerce.number().int().min(0).optional().default(0),
  limit: z.coerce.number().int().min(1).max(48).optional().default(24),
  query: z.string().trim().max(100).optional().default(''),
  brandIds: z.array(z.coerce.number().int().positive()).max(20).optional().default([]),
}).strict();

export const pcBuilderAutoRequestSchema = z.object({
  budget: z.coerce.number().int().min(1_000_000).max(2_000_000_000),
  resolution: z.enum(['1080p', '1440p', '4k']),
  gameType: z.enum(['esports', 'aaa', 'mixed']),
  cpuBrandIds: z.array(z.coerce.number().int().positive()).max(10).optional().default([]),
  gpuBrandIds: z.array(z.coerce.number().int().positive()).max(10).optional().default([]),
}).strict();

export const pcBuilderSaveSchema = z.object({
  name: z.string().trim().min(1).max(150),
  mode: z.enum(['manual', 'auto']).default('manual'),
  selections: pcBuilderSelectionsSchema,
  input: z.record(z.string(), z.unknown()).optional().default({}),
}).strict();

export type PcBuilderSelection = z.infer<typeof pcBuilderSelectionSchema>;

export type PcBuilderDiagnostic = {
  ruleCode: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  componentCodes: PcBuilderComponentCode[];
};
export type PcBuilderFact = {
  productId: number;
  componentCode: PcBuilderComponentCode;
  attributes: Record<string, string[]>;
  metrics: Record<string, number | string | boolean>;
};

export type PcBuilderQuote = {
  items: Array<{
    componentCode: PcBuilderComponentCode;
    productId: number;
    quantity: number;
    name: string;
    sku: string;
    slug: string;
    thumbnail: string;
    price: number;
    lineTotal: number;
    available: boolean;
  }>;
  totals: { subtotal: number; assemblyFee: number; total: number; itemCount: number };
  diagnostics: PcBuilderDiagnostic[];
  compatible: boolean;
  ruleRevision: string;
  profileRevision: string;
  fingerprint: string;
};
