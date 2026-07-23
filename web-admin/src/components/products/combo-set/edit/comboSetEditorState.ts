export function normalizeComboNumericText(value: string) {
  return value.replace(/\D/g, '');
}

export function prependComboItem<T>(items: T[], item: T) {
  return [item, ...items];
}
