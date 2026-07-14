export function normalizeProductSummaryLines(value: string | null | undefined): string[] {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
