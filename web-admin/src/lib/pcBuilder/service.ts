import { createHash, randomBytes } from 'crypto';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { buildCartQuote } from '@/lib/cart-quote';
import { resolveProductImageUrl } from '@/lib/productImageUrl';
import { PublicRequestError } from '@/lib/publicRequest';
import type {
  PcBuilderComponentCode,
  PcBuilderDiagnostic,
  PcBuilderFact,
  PcBuilderQuote,
  PcBuilderSelection,
} from './types';

type DbExecutor = Pool | PoolConnection;
type RuleRow = RowDataPacket & {
  code: string;
  severity: 'error' | 'warning' | 'info';
  operator: 'equality' | 'set_contains' | 'numeric_lte' | 'headroom' | 'requires';
  left_component: PcBuilderComponentCode;
  left_fact: string;
  right_component: PcBuilderComponentCode;
  right_fact: string;
  message: string;
  revision: string;
};

const REQUIRED_COMPONENTS: PcBuilderComponentCode[] = ['cpu', 'mainboard', 'ram', 'storage', 'case', 'psu'];
const MULTI_COMPONENT_LIMITS: Partial<Record<PcBuilderComponentCode, number>> = { ram: 4, storage: 4, monitor: 2 };
const autoResultCache = new Map<string, { expiresAt: number; value: unknown }>();

export function assertPcBuilderFeature(auto = false) {
  if (process.env.PC_BUILDER_ENABLED !== 'true') throw new PublicRequestError(503, 'PC_BUILDER_DISABLED', 'PC Builder chưa được mở.');
  if (auto && process.env.PC_BUILDER_AUTO_ENABLED !== 'true') throw new PublicRequestError(503, 'PC_BUILDER_AUTO_DISABLED', 'Gaming tự động chưa được mở.');
}

function stableHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeSet(values: unknown) {
  return Array.isArray(values) ? values.map((value) => String(value).trim().toLowerCase()).filter(Boolean) : [];
}

function factValue(fact: PcBuilderFact, key: string): string[] | number | string | boolean | undefined {
  if (key.startsWith('attr:')) return fact.attributes[key.slice(5)];
  if (key.startsWith('metric:')) return fact.metrics[key.slice(7)];
  return undefined;
}

function overlaps(left: unknown, right: unknown) {
  const a = normalizeSet(left);
  const b = new Set(normalizeSet(right));
  return a.some((value) => b.has(value));
}

function containsAll(left: unknown, right: unknown) {
  const supported = new Set(normalizeSet(left));
  const required = normalizeSet(right);
  return required.length > 0 && required.every((value) => supported.has(value));
}

export function evaluatePcBuilderCompatibility(
  facts: PcBuilderFact[],
  rules: RuleRow[],
  selections: PcBuilderSelection[],
): PcBuilderDiagnostic[] {
  const diagnostics: PcBuilderDiagnostic[] = [];
  const byComponent = new Map<PcBuilderComponentCode, PcBuilderFact[]>();
  for (const fact of facts) byComponent.set(fact.componentCode, [...(byComponent.get(fact.componentCode) || []), fact]);

  for (const componentCode of REQUIRED_COMPONENTS) {
    if (!byComponent.get(componentCode)?.length) {
      diagnostics.push({ ruleCode: `required_${componentCode}`, severity: 'error', message: `Vui lòng chọn ${componentCode}.`, componentCodes: [componentCode] });
    }
  }

  for (const [componentCode, limit] of Object.entries(MULTI_COMPONENT_LIMITS) as Array<[PcBuilderComponentCode, number]>) {
    const count = selections.filter((item) => item.componentCode === componentCode).reduce((sum, item) => sum + item.quantity, 0);
    if (count > limit) diagnostics.push({ ruleCode: `${componentCode}_selection_limit`, severity: 'error', message: `${componentCode} vượt giới hạn ${limit} dòng/kit.`, componentCodes: [componentCode] });
  }

  for (const rule of rules) {
    const leftFacts = byComponent.get(rule.left_component) || [];
    const rightFacts = byComponent.get(rule.right_component) || [];
    if (!leftFacts.length || !rightFacts.length) continue;
    for (const left of leftFacts) for (const right of rightFacts) {
      const leftValue = factValue(left, rule.left_fact);
      const rightValue = factValue(right, rule.right_fact);
      if (leftValue === undefined || rightValue === undefined) {
        diagnostics.push({
          ruleCode: `${rule.code}_missing_fact`,
          severity: 'error',
          message: `Thiếu thông số đã xác minh để kiểm tra: ${rule.message}`,
          componentCodes: [rule.left_component, rule.right_component],
        });
        continue;
      }
      let valid = true;
      if (rule.operator === 'equality') valid = overlaps(leftValue, rightValue);
      else if (rule.operator === 'set_contains') valid = containsAll(leftValue, rightValue);
      else if (rule.operator === 'numeric_lte' || rule.operator === 'headroom') valid = Number(leftValue) <= Number(rightValue);
      else if (rule.operator === 'requires') valid = Boolean(rightValue);
      if (!valid) diagnostics.push({ ruleCode: rule.code, severity: rule.severity, message: rule.message, componentCodes: [rule.left_component, rule.right_component] });
    }
  }

  const ramModules = facts.filter((fact) => fact.componentCode === 'ram').reduce((sum, fact) => {
    const selection = selections.find((item) => item.productId === fact.productId && item.componentCode === 'ram');
    return sum + Number(fact.metrics.ram_modules_per_kit || 1) * Number(selection?.quantity || 1);
  }, 0);
  const ramSlots = Number(byComponent.get('mainboard')?.[0]?.metrics.main_ram_slot_count || 0);
  if (ramModules && ramSlots && ramModules > ramSlots) diagnostics.push({ ruleCode: 'ram_module_capacity', severity: 'error', message: 'Số module RAM vượt số khe RAM của Mainboard.', componentCodes: ['ram', 'mainboard'] });
  const storageCount = selections.filter((item) => item.componentCode === 'storage').reduce((sum, item) => sum + item.quantity, 0);
  const storagePorts = Number(byComponent.get('mainboard')?.[0]?.metrics.main_m2_slot_count || 0) + Number(byComponent.get('mainboard')?.[0]?.metrics.main_sata_port_count || 0);
  if (storageCount && storagePorts && storageCount > storagePorts) diagnostics.push({ ruleCode: 'storage_port_capacity', severity: 'error', message: 'Số ổ lưu trữ vượt tổng số cổng M.2/SATA đã xác minh của Mainboard.', componentCodes: ['storage', 'mainboard'] });

  if (!byComponent.get('gpu')?.length && byComponent.get('cpu')?.length && byComponent.get('mainboard')?.length) {
    const hasIgpu = Boolean(byComponent.get('cpu')?.[0]?.metrics.cpu_has_igpu);
    const hasOutput = Boolean(byComponent.get('mainboard')?.[0]?.metrics.main_has_video_output);
    if (!(hasIgpu && hasOutput)) diagnostics.push({
      ruleCode: 'display_output_unverified', severity: 'warning',
      message: 'Cấu hình chưa có VGA hoặc đường xuất hình tích hợp đã xác minh. Bạn cần xác nhận trước khi đặt hàng.',
      componentCodes: ['cpu', 'mainboard', 'gpu'],
    });
  }

  return Array.from(new Map(diagnostics.map((item) => [`${item.ruleCode}:${item.componentCodes.join(',')}`, item])).values());
}

async function currentRuleSet(db: DbExecutor) {
  const [sets] = await db.query<RowDataPacket[]>(`SELECT id,revision FROM web_admin_pc_builder_rule_sets
    WHERE status='published' ORDER BY published_at DESC,id DESC LIMIT 1`);
  if (!sets[0]) throw new PublicRequestError(503, 'PC_BUILDER_NOT_READY', 'PC Builder chưa có bộ quy tắc được phát hành.');
  const [rules] = await db.query<RuleRow[]>(`SELECT r.*,s.revision FROM web_admin_pc_builder_rules r
    JOIN web_admin_pc_builder_rule_sets s ON s.id=r.rule_set_id WHERE r.rule_set_id=? AND r.is_enabled=1 ORDER BY r.ordering,r.id`, [sets[0].id]);
  return { revision: String(sets[0].revision), rules };
}

async function loadFacts(db: DbExecutor, selections: PcBuilderSelection[]) {
  const ids = Array.from(new Set(selections.map((item) => item.productId)));
  if (!ids.length) return { facts: [] as PcBuilderFact[], profileRevision: stableHash([]) };
  const [profiles] = await db.query<RowDataPacket[]>(`SELECT product_id,component_code,source_hash,verified_hash,updated_at
    FROM web_admin_pc_builder_product_profiles
    WHERE product_id IN (?) AND state='verified' AND verified_hash=source_hash`, [ids]);
  const profileById = new Map(profiles.map((row) => [Number(row.product_id), row]));
  const invalid = selections.filter((item) => !profileById.has(item.productId));
  if (invalid.length) throw new PublicRequestError(409, 'PROFILE_NOT_VERIFIED', 'Một hoặc nhiều sản phẩm chưa được xác minh hoặc đã thay đổi dữ liệu.');

  const [attributes] = await db.query<RowDataPacket[]>(`SELECT pa.pro_id,a.api_key AS attribute_key,COALESCE(NULLIF(v.api_key,''),v.value) AS attribute_value
    FROM idv_product_attribute pa JOIN idv_attribute a ON a.id=pa.attr_id
    JOIN idv_attribute_value v ON v.id=pa.attr_value_id AND v.attributeId=a.id WHERE pa.pro_id IN (?)`, [ids]);
  const [metrics] = await db.query<RowDataPacket[]>(`SELECT product_id,metric_code,numeric_value,text_value,bool_value
    FROM web_admin_pc_builder_product_metrics WHERE product_id IN (?)`, [ids]);
  const facts = profiles.map((profile) => {
    const productId = Number(profile.product_id);
    const fact: PcBuilderFact = { productId, componentCode: profile.component_code, attributes: {}, metrics: {} };
    for (const row of attributes.filter((item) => Number(item.pro_id) === productId)) {
      const key = String(row.attribute_key || '').trim();
      if (key) fact.attributes[key] = [...(fact.attributes[key] || []), String(row.attribute_value || '')];
    }
    for (const row of metrics.filter((item) => Number(item.product_id) === productId)) {
      const value = row.numeric_value !== null ? Number(row.numeric_value) : row.bool_value !== null ? Boolean(row.bool_value) : String(row.text_value || '');
      fact.metrics[String(row.metric_code)] = value;
    }
    return fact;
  });
  return {
    facts,
    profileRevision: stableHash(profiles.map((row) => [Number(row.product_id), String(row.source_hash), String(row.updated_at)]).sort()),
  };
}

function validateSelections(selections: PcBuilderSelection[]) {
  const seen = new Set<string>();
  for (const selection of selections) {
    const key = `${selection.componentCode}:${selection.productId}`;
    if (seen.has(key)) throw new PublicRequestError(400, 'DUPLICATE_SELECTION', 'Sản phẩm bị lặp trong cùng một nhóm linh kiện.');
    seen.add(key);
  }
}

export async function buildPcBuilderQuote(selections: PcBuilderSelection[], options?: { db?: DbExecutor; assemblyRequired?: boolean }): Promise<PcBuilderQuote> {
  validateSelections(selections);
  const db = options?.db || pool;
  const [{ revision, rules }, loaded, cart] = await Promise.all([
    currentRuleSet(db),
    loadFacts(db, selections),
    buildCartQuote(selections.map((item) => ({ productId: item.productId, quantity: item.quantity })), { db }),
  ]);
  const selectionByProduct = new Map(selections.map((item) => [item.productId, item]));
  const diagnostics = evaluatePcBuilderCompatibility(loaded.facts, rules, selections);
  for (const item of cart.items) if (!item.available) diagnostics.push({
    ruleCode: `catalog_${item.reason || 'unavailable'}`, severity: 'error',
    message: `${item.name} không còn bán hoặc không có giá hợp lệ.`,
    componentCodes: [selectionByProduct.get(item.productId)?.componentCode || 'cpu'],
  });
  const items = cart.items.map((item) => ({
    componentCode: selectionByProduct.get(item.productId)!.componentCode,
    productId: item.productId, quantity: item.quantity, name: item.name, sku: item.sku, slug: item.slug,
    thumbnail: item.thumbnail, price: item.price, lineTotal: item.lineTotal, available: item.available,
  }));
  const fingerprint = stableHash({ selections: [...selections].sort((a, b) => a.componentCode.localeCompare(b.componentCode) || a.productId - b.productId), revision, profileRevision: loaded.profileRevision, prices: items.map((item) => [item.productId, item.price]) });
  return {
    items,
    totals: { subtotal: cart.totals.subtotal, assemblyFee: 0, total: cart.totals.subtotal, itemCount: cart.totals.itemCount },
    diagnostics,
    compatible: !diagnostics.some((item) => item.severity === 'error'),
    ruleRevision: revision,
    profileRevision: loaded.profileRevision,
    fingerprint,
  };
}

export async function getPcBuilderBootstrap() {
  const [installed] = await pool.query<RowDataPacket[]>("SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='web_admin_pc_builder_components' LIMIT 1");
  if (!installed[0]) return { data: { enabled: false, autoEnabled: false, ruleRevision: '', components: [], coverage: [], minimumBudget: 0, migrationRequired: true }, etag: '"pc-builder-not-installed"' };
  const [{ revision }, [components], [coverage], [minimum]] = await Promise.all([
    currentRuleSet(pool),
    pool.query<RowDataPacket[]>('SELECT code,name,is_required,min_selections,max_selections,ordering FROM web_admin_pc_builder_components WHERE status=1 ORDER BY ordering'),
    pool.query<RowDataPacket[]>(`SELECT component_code,COUNT(*) total,SUM(state='verified' AND source_hash=verified_hash) verified,
      SUM(state='pending') pending,SUM(state='stale' OR (state='verified' AND source_hash<>verified_hash)) stale
      FROM web_admin_pc_builder_product_profiles GROUP BY component_code`),
    pool.query<RowDataPacket[]>(`SELECT SUM(x.minimum_price) minimum_budget FROM (
      SELECT pf.component_code,MIN(pr.price) minimum_price FROM web_admin_pc_builder_product_profiles pf
      JOIN idv_sell_product_price pr ON pr.id=pf.product_id AND pr.isOn=1 AND pr.price>0
      WHERE pf.state='verified' AND pf.source_hash=pf.verified_hash AND pf.component_code IN ('cpu','mainboard','ram','storage','case','psu')
      GROUP BY pf.component_code
    ) x`),
  ]);
  const data = {
    enabled: process.env.PC_BUILDER_ENABLED === 'true',
    autoEnabled: process.env.PC_BUILDER_AUTO_ENABLED === 'true',
    ruleRevision: revision,
    components: components.map((row) => ({ code: row.code, name: row.name, required: Boolean(row.is_required), minSelections: Number(row.min_selections), maxSelections: Number(row.max_selections), ordering: Number(row.ordering) })),
    coverage: coverage.map((row) => ({ componentCode: row.component_code, total: Number(row.total), verified: Number(row.verified), pending: Number(row.pending), stale: Number(row.stale) })),
    minimumBudget: Number(minimum[0]?.minimum_budget || 0),
  };
  return { data, etag: `"${stableHash(data).slice(0, 32)}"` };
}

export async function listPcBuilderCandidates(input: { componentCode: PcBuilderComponentCode; selections: PcBuilderSelection[]; cursor: number; limit: number; query: string; brandIds: number[] }) {
  const values: unknown[] = [input.componentCode];
  const where = ["pf.component_code=?", "pf.state='verified'", 'pf.source_hash=pf.verified_hash', 'pr.isOn=1', 'pr.price>0'];
  if (input.cursor) { where.push('p.id<?'); values.push(input.cursor); }
  if (input.query) { where.push('(p.proName LIKE ? OR p.storeSKU LIKE ?)'); values.push(`%${input.query}%`, `%${input.query}%`); }
  if (input.brandIds.length) { where.push('p.brandId IN (?)'); values.push(input.brandIds); }
  values.push(input.limit + 1);
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT p.id,p.proName,p.storeSKU,p.proThum,p.brandId,b.name brandName,pr.price,pr.market_price,u.request_path slug
    FROM web_admin_pc_builder_product_profiles pf JOIN idv_sell_product_store p ON p.id=pf.product_id
    JOIN idv_sell_product_price pr ON pr.id=p.id LEFT JOIN idv_brand b ON b.id=p.brandId
    LEFT JOIN idv_url u ON u.id_path=CONCAT('module:product/view:product-detail/view_id:',p.id)
    WHERE ${where.join(' AND ')} ORDER BY p.id DESC LIMIT ?`, values);
  const page = rows.slice(0, input.limit);
  const candidates = [];
  for (const row of page) {
    const tentative = [...input.selections.filter((item) => item.componentCode !== input.componentCode || input.componentCode === 'ram' || input.componentCode === 'storage'), { componentCode: input.componentCode, productId: Number(row.id), quantity: 1 }];
    let diagnostics: PcBuilderDiagnostic[] = [];
    try {
      const [{ rules }, loaded] = await Promise.all([currentRuleSet(pool), loadFacts(pool, tentative)]);
      diagnostics = evaluatePcBuilderCompatibility(loaded.facts, rules, tentative).filter((item) => !item.ruleCode.startsWith('required_'));
    } catch (error) {
      if (error instanceof PublicRequestError && error.code === 'PROFILE_NOT_VERIFIED') diagnostics = [];
      else throw error;
    }
    candidates.push({
      productId: Number(row.id), name: String(row.proName), sku: String(row.storeSKU || ''),
      thumbnail: resolveProductImageUrl(row.proThum, ''), brandId: Number(row.brandId || 0), brandName: String(row.brandName || ''),
      price: Number(row.price), marketPrice: Number(row.market_price || 0), slug: String(row.slug || '').replace(/^\/+/, ''),
      compatible: !diagnostics.some((item) => item.severity === 'error'), reasons: diagnostics,
    });
  }
  return { items: candidates, nextCursor: rows.length > input.limit ? Number(page.at(-1)?.id || 0) : null };
}

export async function savePcBuild(input: { name: string; mode: 'manual' | 'auto'; selections: PcBuilderSelection[]; input: Record<string, unknown> }, customerId: number | null) {
  const quote = await buildPcBuilderQuote(input.selections);
  if (!quote.compatible) throw new PublicRequestError(409, 'INCOMPATIBLE_BUILD', 'Cấu hình còn lỗi tương thích và chưa thể lưu.');
  const token = customerId ? null : randomBytes(32).toString('base64url');
  const tokenHash = token ? createHash('sha256').update(token).digest('hex') : null;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(`INSERT INTO web_admin_pc_builds
      (customer_id,name,mode,input_json,share_token_hash,expires_at,rule_revision,profile_revision,fingerprint)
      VALUES (?,?,?,?,?,${customerId ? 'NULL' : 'DATE_ADD(NOW(),INTERVAL 90 DAY)'},?,?,?)`,
    [customerId, input.name, input.mode, JSON.stringify(input.input), tokenHash, quote.ruleRevision, quote.profileRevision, quote.fingerprint]);
    const buildId = Number((result as { insertId?: number }).insertId || 0);
    await connection.query(`INSERT INTO web_admin_pc_build_items (build_id,component_code,product_id,quantity,ordering) VALUES ?`,
      [input.selections.map((item, index) => [buildId, item.componentCode, item.productId, item.quantity, index])]);
    await connection.commit();
    return { id: buildId, shareToken: token, quote };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export async function getSharedPcBuild(token: string) {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) throw new PublicRequestError(404, 'BUILD_NOT_FOUND', 'Không tìm thấy cấu hình.');
  const hash = createHash('sha256').update(token).digest('hex');
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT id,name,mode,input_json,created_at FROM web_admin_pc_builds
    WHERE share_token_hash=? AND status='active' AND customer_id IS NULL AND expires_at>NOW() LIMIT 1`, [hash]);
  if (!rows[0]) throw new PublicRequestError(404, 'BUILD_NOT_FOUND', 'Cấu hình không tồn tại hoặc đã hết hạn.');
  const [items] = await pool.query<RowDataPacket[]>('SELECT component_code,product_id,quantity FROM web_admin_pc_build_items WHERE build_id=? ORDER BY ordering,id', [rows[0].id]);
  const selections = items.map((item) => ({ componentCode: item.component_code, productId: Number(item.product_id), quantity: Number(item.quantity) })) as PcBuilderSelection[];
  return { id: Number(rows[0].id), name: String(rows[0].name), mode: rows[0].mode, input: rows[0].input_json, createdAt: rows[0].created_at, quote: await buildPcBuilderQuote(selections) };
}

type AutoInput = { budget: number; resolution: '1080p' | '1440p' | '4k'; gameType: 'esports' | 'aaa' | 'mixed'; cpuBrandIds: number[]; gpuBrandIds: number[] };
type AutoCandidate = { productId: number; componentCode: PcBuilderComponentCode; price: number; fact: PcBuilderFact; cpuScore: number; gpuScore: number };
type AutoResult = { variants: Array<{ variant: 'value' | 'balanced' | 'performance'; quote: PcBuilderQuote; performanceScore: number }>; minimumBudget: number; reason?: string; ruleRevision?: string; profileRevision?: string };

export async function buildAutomaticGamingPcs(input: AutoInput): Promise<AutoResult> {
  assertPcBuilderFeature(true);
  const [versionRows] = await pool.query<RowDataPacket[]>("SELECT cache_key,version FROM web_admin_cache_versions WHERE cache_key IN ('pc_builder','public_products')");
  const cacheKey = stableHash({ input, versions: versionRows.map((row) => [row.cache_key, Number(row.version)]).sort() });
  const cached = autoResultCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value as AutoResult;
  const cacheResult = <T>(value: T) => {
    autoResultCache.set(cacheKey, { value, expiresAt: Date.now() + 30_000 });
    while (autoResultCache.size > 50) autoResultCache.delete(autoResultCache.keys().next().value!);
    return value;
  };
  const [policies] = await pool.query<RowDataPacket[]>(`SELECT revision,variant,config_json FROM web_admin_pc_builder_gaming_policies
    WHERE status='published' AND resolution=? AND game_type=? ORDER BY published_at DESC,id DESC`, [input.resolution, input.gameType]);
  const policyByVariant = new Map<string, RowDataPacket>();
  for (const policy of policies) if (!policyByVariant.has(String(policy.variant))) policyByVariant.set(String(policy.variant), policy);
  if (!policyByVariant.size) throw new PublicRequestError(503, 'PC_BUILDER_POLICY_MISSING', 'Chưa có chính sách Gaming phù hợp được phát hành.');
  const basePolicy = (policyByVariant.get('balanced')?.config_json || {}) as Record<string, unknown>;
  const minimumRamGb = Number(basePolicy.minimumRamGb || (input.resolution === '1080p' ? 16 : 32));
  const minimumStorageGb = Number(basePolicy.minimumStorageGb || (input.resolution === '1080p' && input.gameType === 'esports' ? 500 : 1000));
  const components: PcBuilderComponentCode[] = ['cpu','mainboard','ram','storage','case','psu','gpu'];
  const values: unknown[] = [];
  const brandCondition = (code: string, ids: number[]) => {
    if (!ids.length) return '';
    values.push(code, ids);
    return ' AND NOT (pf.component_code=? AND p.brandId NOT IN (?))';
  };
  const cpuBrandSql = brandCondition('cpu', input.cpuBrandIds);
  const gpuBrandSql = brandCondition('gpu', input.gpuBrandIds);
  values.push(components);
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT pf.product_id,pf.component_code,pr.price,p.brandId,
      MAX(CASE WHEN m.metric_code='cpu_gaming_score' THEN m.numeric_value END) cpu_score,
      MAX(CASE WHEN m.metric_code='gpu_gaming_score' THEN m.numeric_value END) gpu_score
    FROM web_admin_pc_builder_product_profiles pf JOIN idv_sell_product_store p ON p.id=pf.product_id
    JOIN idv_sell_product_price pr ON pr.id=pf.product_id AND pr.isOn=1 AND pr.price>0
    LEFT JOIN web_admin_pc_builder_product_metrics m ON m.product_id=pf.product_id
    WHERE pf.state='verified' AND pf.source_hash=pf.verified_hash${cpuBrandSql}${gpuBrandSql} AND pf.component_code IN (?)
    GROUP BY pf.product_id,pf.component_code,pr.price,p.brandId
    ORDER BY COALESCE(gpu_score,cpu_score,0) DESC,pr.price ASC`, values);
  const shortlisted: RowDataPacket[] = [];
  const counts = new Map<string, number>();
  for (const row of rows) {
    const code = String(row.component_code);
    const limit = code === 'cpu' || code === 'gpu' ? 24 : 14;
    if ((counts.get(code) || 0) >= limit) continue;
    if ((code === 'cpu' && Number(row.cpu_score || 0) <= 0) || (code === 'gpu' && Number(row.gpu_score || 0) <= 0)) continue;
    counts.set(code, (counts.get(code) || 0) + 1);
    shortlisted.push(row);
  }
  if (components.some((code) => !counts.get(code))) return cacheResult({ variants: [], minimumBudget: 0, reason: 'INSUFFICIENT_VERIFIED_CATALOG' });
  const allSelections = shortlisted.map((row) => ({ componentCode: row.component_code, productId: Number(row.product_id), quantity: 1 })) as PcBuilderSelection[];
  const [{ rules, revision }, loaded] = await Promise.all([currentRuleSet(pool), loadFacts(pool, allSelections)]);
  const factsById = new Map(loaded.facts.map((fact) => [fact.productId, fact]));
  const pools = new Map<PcBuilderComponentCode, AutoCandidate[]>();
  for (const row of shortlisted) {
    const fact = factsById.get(Number(row.product_id));
    if (!fact) continue;
    const candidate: AutoCandidate = { productId: Number(row.product_id), componentCode: row.component_code, price: Number(row.price), fact, cpuScore: Number(row.cpu_score || 0), gpuScore: Number(row.gpu_score || 0) };
    pools.set(candidate.componentCode, [...(pools.get(candidate.componentCode) || []), candidate]);
  }
  type Beam = { selections: PcBuilderSelection[]; facts: PcBuilderFact[]; price: number; cpuScore: number; gpuScore: number };
  let beam: Beam[] = [{ selections: [], facts: [], price: 0, cpuScore: 0, gpuScore: 0 }];
  for (const componentCode of components) {
    const expanded: Beam[] = [];
    for (const state of beam) for (const candidate of pools.get(componentCode) || []) {
      if (state.price + candidate.price > input.budget) continue;
      if (componentCode === 'ram' && Number(candidate.fact.metrics.ram_capacity_gb || 0) < minimumRamGb) continue;
      if (componentCode === 'storage' && Number(candidate.fact.metrics.storage_capacity_gb || 0) < minimumStorageGb) continue;
      const selections = [...state.selections, { componentCode, productId: candidate.productId, quantity: 1 }];
      const facts = [...state.facts, candidate.fact];
      const failures = evaluatePcBuilderCompatibility(facts, rules, selections).filter((item) => item.severity === 'error' && !item.ruleCode.startsWith('required_'));
      if (failures.length) continue;
      expanded.push({ selections, facts, price: state.price + candidate.price, cpuScore: state.cpuScore || candidate.cpuScore, gpuScore: state.gpuScore || candidate.gpuScore });
    }
    expanded.sort((a, b) => {
      const scoreA = a.gpuScore * 0.72 + a.cpuScore * 0.28;
      const scoreB = b.gpuScore * 0.72 + b.cpuScore * 0.28;
      return scoreB - scoreA || a.price - b.price;
    });
    beam = expanded.slice(0, 300);
    if (!beam.length) break;
  }
  if (!beam.length) return cacheResult({ variants: [], minimumBudget: 0, reason: 'NO_COMPATIBLE_BUILD_IN_BUDGET', ruleRevision: revision });
  const performanceScore = (item: Beam) => item.gpuScore * 0.72 + item.cpuScore * 0.28;
  beam = beam.filter((item) => performanceScore(item) >= Number(basePolicy.minimumGamingScore || 0));
  if (!beam.length) return cacheResult({ variants: [], minimumBudget: 0, reason: 'PERFORMANCE_FLOOR_NOT_MET', ruleRevision: revision });
  const ranked = {
    value: [...beam].sort((a, b) => performanceScore(b) / b.price - performanceScore(a) / a.price),
    balanced: [...beam].sort((a, b) => Math.abs(a.gpuScore - a.cpuScore) - Math.abs(b.gpuScore - b.cpuScore) || performanceScore(b) - performanceScore(a)),
    performance: [...beam].sort((a, b) => performanceScore(b) - performanceScore(a) || b.price - a.price),
  };
  const chosen: Array<{ variant: 'value' | 'balanced' | 'performance'; state: Beam }> = [];
  for (const variant of ['value', 'balanced', 'performance'] as const) {
    const state = ranked[variant].find((candidate) => !chosen.some((entry) =>
      entry.state.selections.find((x) => x.componentCode === 'cpu')?.productId === candidate.selections.find((x) => x.componentCode === 'cpu')?.productId &&
      entry.state.selections.find((x) => x.componentCode === 'gpu')?.productId === candidate.selections.find((x) => x.componentCode === 'gpu')?.productId));
    if (!state) continue;
    chosen.push({ variant, state });
  }
  const variants = [];
  for (const item of chosen) variants.push({ variant: item.variant, quote: await buildPcBuilderQuote(item.state.selections), performanceScore: performanceScore(item.state) });
  return cacheResult({ variants, minimumBudget: Math.min(...beam.map((item) => item.price)), ruleRevision: revision, profileRevision: loaded.profileRevision });
}

export async function listCustomerPcBuilds(customerId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT b.id,b.name,b.mode,b.rule_revision,b.profile_revision,b.fingerprint,b.created_at,b.updated_at,
    COUNT(i.id) item_count FROM web_admin_pc_builds b LEFT JOIN web_admin_pc_build_items i ON i.build_id=b.id
    WHERE b.customer_id=? AND b.status='active' GROUP BY b.id ORDER BY b.updated_at DESC,b.id DESC LIMIT 100`, [customerId]);
  return rows.map((row) => ({ id: Number(row.id), name: String(row.name), mode: row.mode, itemCount: Number(row.item_count), ruleRevision: row.rule_revision, profileRevision: row.profile_revision, fingerprint: row.fingerprint, createdAt: row.created_at, updatedAt: row.updated_at }));
}

export async function getCustomerPcBuild(customerId: number, buildId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT id,name,mode,input_json,created_at,updated_at FROM web_admin_pc_builds
    WHERE id=? AND customer_id=? AND status='active' LIMIT 1`, [buildId, customerId]);
  if (!rows[0]) throw new PublicRequestError(404, 'BUILD_NOT_FOUND', 'Không tìm thấy cấu hình.');
  const [items] = await pool.query<RowDataPacket[]>('SELECT component_code,product_id,quantity FROM web_admin_pc_build_items WHERE build_id=? ORDER BY ordering,id', [buildId]);
  const selections = items.map((item) => ({ componentCode: item.component_code, productId: Number(item.product_id), quantity: Number(item.quantity) })) as PcBuilderSelection[];
  return { id: buildId, name: rows[0].name, mode: rows[0].mode, input: rows[0].input_json, createdAt: rows[0].created_at, updatedAt: rows[0].updated_at, quote: await buildPcBuilderQuote(selections) };
}

export async function updateCustomerPcBuild(customerId: number, buildId: number, input: { name: string; mode: 'manual' | 'auto'; selections: PcBuilderSelection[]; input: Record<string, unknown> }) {
  const quote = await buildPcBuilderQuote(input.selections);
  if (!quote.compatible) throw new PublicRequestError(409, 'INCOMPATIBLE_BUILD', 'Cấu hình còn lỗi tương thích và chưa thể lưu.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>("SELECT id FROM web_admin_pc_builds WHERE id=? AND customer_id=? AND status='active' FOR UPDATE", [buildId, customerId]);
    if (!rows[0]) throw new PublicRequestError(404, 'BUILD_NOT_FOUND', 'Không tìm thấy cấu hình.');
    await connection.query(`UPDATE web_admin_pc_builds SET name=?,mode=?,input_json=?,rule_revision=?,profile_revision=?,fingerprint=? WHERE id=?`,
      [input.name, input.mode, JSON.stringify(input.input), quote.ruleRevision, quote.profileRevision, quote.fingerprint, buildId]);
    await connection.query('DELETE FROM web_admin_pc_build_items WHERE build_id=?', [buildId]);
    await connection.query('INSERT INTO web_admin_pc_build_items (build_id,component_code,product_id,quantity,ordering) VALUES ?',
      [input.selections.map((item, index) => [buildId, item.componentCode, item.productId, item.quantity, index])]);
    await connection.commit(); return { id: buildId, quote };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export async function deleteCustomerPcBuild(customerId: number, buildId: number) {
  const [result] = await pool.query("UPDATE web_admin_pc_builds SET status='deleted',share_token_hash=NULL WHERE id=? AND customer_id=? AND status='active'", [buildId, customerId]);
  if (Number((result as { affectedRows?: number }).affectedRows || 0) !== 1) throw new PublicRequestError(404, 'BUILD_NOT_FOUND', 'Không tìm thấy cấu hình.');
  return { id: buildId, deleted: true };
}
