export type ComboEndTimeMode = 'unlimited' | 'limited';

const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

export function formatComboDatetimeLocal(unixSeconds: number) {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return '';
  const date = new Date(unixSeconds * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseComboDatetimeLocal(value: string) {
  if (!value) return 0;
  const milliseconds = new Date(value).getTime();
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : 0;
}

export function comboEndTimeMode(toTime: number): ComboEndTimeMode {
  return Number(toTime) > 0 ? 'limited' : 'unlimited';
}

export function defaultLimitedEndTime(fromTimeValue: string, nowMilliseconds = Date.now()) {
  const fromTime = parseComboDatetimeLocal(fromTimeValue);
  const baseTime = fromTime > 0 ? fromTime : Math.floor(nowMilliseconds / 1000);
  return formatComboDatetimeLocal(baseTime + THIRTY_DAYS_IN_SECONDS);
}

export function resolveComboEndTime(input: {
  mode: ComboEndTimeMode;
  fromTimeValue: string;
  toTimeValue: string;
}): { toTime: number; error: string } {
  if (input.mode === 'unlimited') return { toTime: 0, error: '' };

  const toTime = parseComboDatetimeLocal(input.toTimeValue);
  if (toTime <= 0) {
    return { toTime: 0, error: 'Vui lòng chọn thời gian kết thúc.' };
  }

  const fromTime = parseComboDatetimeLocal(input.fromTimeValue);
  if (fromTime > 0 && toTime <= fromTime) {
    return { toTime: 0, error: 'Thời gian kết thúc phải sau thời gian bắt đầu.' };
  }

  return { toTime, error: '' };
}
