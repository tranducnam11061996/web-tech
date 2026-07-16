import type { FuseResult } from 'fuse.js';

export const SYNONYM_GROUPS: string[][] = [
  ['laptop', 'may tinh xach tay'],
  ['vga', 'card do hoa', 'card man hinh'],
  ['chuot', 'mouse'],
  ['ban phim', 'keyboard'],
  ['man hinh', 'monitor', 'lcd', 'display'],
  ['cpu', 'chip', 'bo vi xu ly', 'vi xu ly'],
  ['ram', 'bo nho trong', 'bo nho ram'],
  ['ssd', 'o cung', 'hdd', 'o cung the ran'],
];

export const SEARCH_EXCLUSIONS: Record<string, string[]> = {
  pc: ['tay cam', 'lot chuot', 'ban di', 'vo case', 'balo', 'tui', 'phu kien', 'linh kien', 'nguon', 'vo lang', 'laptop', 'hop o cung', 'o cung gan ngoai', 'tai nghe', 'tan nhiet'],
  laptop: ['cap', 'balo', 'tui', 'quat', 'ban phim', 'vo laptop', 'ban di', 'phu kien', 'pin', 'nguon', 'vo lang', 'tai nghe', 'gia do', 'bao hanh'],
  gaming: ['tay cam', 'lot chuot', 'ban di', 'vo lang'],
};

export const PRINTER_INTENT_PHRASE = 'may in';
const PRINTER_INTENT_OPT_OUTS = ['muc', 'cap', 'day', 'khay', 'sua', 'phu kien'];
export const STRICT_PC_INTENT_QUERY = 'pc';

const synonymRegexes = SYNONYM_GROUPS.map((group) => group.map((phrase) => ({ phrase, regex: standalonePattern(phrase) })));
const strictPcProductNameRegexes = ['pc', 'bo pc', 'full bo pc'].map(startsWithPattern);

export interface LexicalSearchProduct {
  id: number;
  storeSKU: string;
  searchText: string;
  normalizedName: string;
  categoryIds: ReadonlySet<number>;
}

export interface RankedLexicalProduct {
  product: LexicalSearchProduct;
  score: number;
  customRank: number;
}

export function normalizeSearchText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function standalonePattern(value: string) {
  return new RegExp(`(^|\\s)${escapeRegex(value)}($|\\s)`);
}

function startsWithPattern(value: string) {
  return new RegExp(`^${escapeRegex(value)}($|\\s)`);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function containsStandalonePhrase(text: string, phrase: string) {
  return standalonePattern(phrase).test(text);
}

export function getSearchIntent(normalizedQuery: string) {
  if (normalizedQuery === STRICT_PC_INTENT_QUERY) return 'pc' as const;
  if (!containsStandalonePhrase(normalizedQuery, PRINTER_INTENT_PHRASE)) return null;
  if (PRINTER_INTENT_OPT_OUTS.some((word) => containsStandalonePhrase(normalizedQuery, word))) return null;
  return 'printer' as const;
}

export function matchesStrictPcProductName(normalizedName: string) {
  return strictPcProductNameRegexes.some((regex) => regex.test(normalizedName));
}

export function injectSearchSynonyms(text: string): string {
  if (!text) return text;
  const appended: string[] = [];

  for (const group of synonymRegexes) {
    if (!group.some(({ regex }) => regex.test(text))) continue;
    for (const { phrase, regex } of group) {
      if (!regex.test(text)) appended.push(phrase);
    }
  }

  return appended.length ? `${text} ${appended.join(' ')}` : text;
}

function getPhraseAlternatives(normalizedQuery: string) {
  const matchingGroup = SYNONYM_GROUPS.find((group) => group.includes(normalizedQuery));
  return matchingGroup ? [normalizedQuery, ...matchingGroup.filter((phrase) => phrase !== normalizedQuery)] : [normalizedQuery];
}

export function getActiveExclusions(normalizedQuery: string) {
  const active = new Set<string>();
  const semanticPhrases = getPhraseAlternatives(normalizedQuery);
  for (const [trigger, exclusions] of Object.entries(SEARCH_EXCLUSIONS)) {
    if (!semanticPhrases.some((phrase) => containsStandalonePhrase(phrase, trigger))) continue;
    for (const exclusion of exclusions) {
      if (!containsStandalonePhrase(normalizedQuery, exclusion)) active.add(exclusion);
    }
  }
  return [...active];
}

function getRank(name: string, phrase: string) {
  const tokens = phrase.split(' ').filter(Boolean);
  if (startsWithPattern(phrase).test(name)) return 1;
  if (containsStandalonePhrase(name, phrase)) return 2;
  if (tokens.length > 1 && tokens.every((token) => containsStandalonePhrase(name, token))) return 3;
  if (tokens.some((token) => containsStandalonePhrase(name, token))) return 4;
  return 5;
}

export function buildFuseQuery(normalizedQuery: string) {
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  if (getSearchIntent(normalizedQuery) === 'printer') {
    const printerTokenIndex = tokens.findIndex((token, index) => token === 'may' && tokens[index + 1] === 'in');
    const remainingTokens = tokens.filter((_, index) => index !== printerTokenIndex && index !== printerTokenIndex + 1);
    return {
      $and: [
        { searchText: `'${PRINTER_INTENT_PHRASE}` },
        ...remainingTokens.map((token) => ({ searchText: `${token.length <= 4 ? "'" : ''}${token}` })),
      ],
    };
  }
  if (tokens.length <= 1) return `${normalizedQuery.length <= 4 ? "'" : ''}${normalizedQuery}`;
  return {
    $and: tokens.map((token) => ({ searchText: `${token.length <= 4 ? "'" : ''}${token}` })),
  };
}

export function rankLexicalResults(
  rawResults: Array<FuseResult<LexicalSearchProduct>>,
  query: string,
): RankedLexicalProduct[] {
  const normalizedQuery = normalizeSearchText(query);
  const searchIntent = getSearchIntent(normalizedQuery);
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const specTokens = tokens.filter((token) => /\d/.test(token));
  const activeExclusions = getActiveExclusions(normalizedQuery);
  const phraseAlternatives = getPhraseAlternatives(normalizedQuery);
  const ranked: RankedLexicalProduct[] = [];

  for (const result of rawResults) {
    const score = result.score ?? 1;
    if (score >= 0.4) continue;

    const product = result.item;
    if (searchIntent === 'pc' && !matchesStrictPcProductName(product.normalizedName)) continue;

    const hasSuffixOnlyMatch = tokens.some((token) =>
      product.normalizedName.includes(token) && !new RegExp(`(^|\\s)${escapeRegex(token)}`).test(product.normalizedName),
    );
    if (hasSuffixOnlyMatch) continue;

    if (specTokens.some((token) => !new RegExp(`(^|\\s)${escapeRegex(token)}`, 'i').test(product.searchText))) continue;
    if (activeExclusions.some((phrase) => containsStandalonePhrase(product.normalizedName, phrase))) continue;

    const customRank = Math.min(...phraseAlternatives.map((phrase) => getRank(product.normalizedName, phrase)));
    ranked.push({ product, score, customRank });
  }

  return ranked.sort((left, right) =>
    left.customRank - right.customRank || left.score - right.score || right.product.id - left.product.id,
  );
}
