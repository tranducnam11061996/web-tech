const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const TEXT_REPAIRS: Record<string, string> = {
  'Danh MÃ¡Â»Â¥c': 'Danh Mục',
  'NÃ¡Â»â€¢i bÃ¡ÂºÂ­t': 'Nổi bật',
  'Ã°Å¸â€Â¥': '🔥',
  'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥': '🔥',
  'Ã°Å¸â€™Â»': '💻',
  'ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â»': '💻',
  'Ã°Å¸Â¤â€“': '🤖',
  'ÃƒÂ°Ã…Â¸Ã‚Â¤Ã¢â‚¬â€œ': '🤖',
  'Ã°Å¸â€ºÂ Ã¯Â¸Â': '🛠️',
  'Ã°Å¸ÂÂ·Ã¯Â¸Â': '🏷️',
  'ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â·ÃƒÂ¯Ã‚Â¸Ã‚Â': '🏷️',
  'Ã¢ÂÂ³': '⏳',
  'ÃƒÂ¢Ã‚ÂÃ‚Â³': '⏳',
  'Ã¢â€ºâ€ž': '⛄',
  'ÃƒÂ¢Ã¢â‚¬ÂºÃ¢â‚¬Å¾': '⛄',
  'Ã¢Å“Â¨': '✨',
  'ÃƒÂ¢Ã…â€œÃ‚Â¨': '✨',
  'Ã¢Å¡Â¡': '⚡',
  'ÃƒÂ¢Ã…Â¡Ã‚Â¡': '⚡',
  'Ã¢Å¡â„¢Ã¯Â¸Â': '⚙️',
  'ÃƒÂ¢Ã…Â¡Ã¢â€žÂ¢ÃƒÂ¯Ã‚Â¸Ã‚Â': '⚙️',
  'Ã¢Ëœâ€¦': '★',
  'ÃƒÂ¢Ã‹Å“Ã¢â‚¬Â¦': '★',
  'Ã¢Ëœâ€ ': '☆',
  'ÃƒÂ¢Ã‹Å“Ã¢â‚¬Â ': '☆',
  'Ã¢â‚¬Âº': '›',
  'ÃƒÂ¢Ã¢â€šÂ¬Ã‚Âº': '›',
};

const FINAL_TEXT_REPAIRS: Record<string, string> = {
  'Danh MÃ¡Â»Â¥c': 'Danh Mục',
  'NÃ¡Â»â€¢i bÃ¡ÂºÂ­t': 'Nổi bật',
  'Ã°Å¸â€Â¥': '🔥',
  'Ã°Å¸â€™Â»': '💻',
  'Ã°Å¸Â¤â€“': '🤖',
  'Ã°Å¸â€ºÂ Ã¯Â¸Â': '🛠️',
  'Ã°Å¸ÂÂ·Ã¯Â¸Â': '🏷️',
  'Ã¢ÂÂ³': '⏳',
  'Ã¢â€ºâ€ž': '⛄',
  'Ã¢Å“Â¨': '✨',
  'Ã¢Å¡Â¡': '⚡',
  'Ã¢Å¡â„¢Ã¯Â¸Â': '⚙️',
  'Ã¢Ëœâ€¦': '★',
  'Ã¢Ëœâ€ ': '☆',
  'Ã¢â‚¬Âº': '›',
};

export function cleanMenuText(value: unknown) {
  let text = String(value || '');
  for (const [broken, fixed] of [...Object.entries(TEXT_REPAIRS), ...Object.entries(FINAL_TEXT_REPAIRS)]) {
    text = text.split(broken).join(fixed);
  }
  return text;
}

export function cleanMenuTextTrimmed(value: unknown) {
  return cleanMenuText(value).trim();
}

export function resolveMenuMediaUrl(value?: string) {
  const url = cleanMenuTextTrimmed(value);
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  if (url.startsWith('/api/media/')) return `${API_URL}${url}`;
  if (url.startsWith('/media/')) return `https://hanoicomputercdn.com${url}`;
  return url;
}

export function resolveMenuHexColor(value?: string, fallback = '') {
  const color = cleanMenuTextTrimmed(value).replace(/^#/, '').toLowerCase();
  return /^[0-9a-f]{3}([0-9a-f]{3})?$/.test(color) ? `#${color}` : fallback;
}
