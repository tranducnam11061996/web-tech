const blockedElementPattern = /<(script|style|iframe|object|embed|form|textarea|select|option)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const blockedTagPattern = /<\/?(?:script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|option)\b[^>]*>/gi;
const eventAttributePattern = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const unsafeUrlPattern = /\s+(href|src|action|formaction)\s*=\s*(?:"\s*(?:javascript|data:text\/html)[^"]*"|'\s*(?:javascript|data:text\/html)[^']*'|(?:javascript|data:text\/html)[^\s>]*)/gi;

/** Sanitizes legacy CMS HTML before rendering it in public React components. */
export function sanitizeLegacyHtml(value: string | null | undefined) {
  return String(value || '')
    .replace(blockedElementPattern, '')
    .replace(blockedTagPattern, '')
    .replace(eventAttributePattern, '')
    .replace(unsafeUrlPattern, '');
}

function decodeHtmlEntities(value: string) {
  const decodeCodePoint = (code: string, radix: number) => {
    const parsed = Number.parseInt(code, radix);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 0x10ffff
      ? String.fromCodePoint(parsed)
      : '';
  };
  let decoded = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = decoded
      .replace(/&#x([0-9a-f]+);?/gi, (_match, code: string) => (
        decodeCodePoint(code, 16)
      ))
      .replace(/&#([0-9]+);?/g, (_match, code: string) => (
        decodeCodePoint(code, 10)
      ))
      .replace(/&nbsp;?/gi, ' ')
      .replace(/&amp;?/gi, '&')
      .replace(/&quot;?/gi, '"')
      .replace(/&apos;?|&#39;?/gi, "'")
      .replace(/&lt;?/gi, '<')
      .replace(/&gt;?/gi, '>')
      .replace(/&colon;?/gi, ':')
      .replace(/&tab;?/gi, '\t')
      .replace(/&newline;?/gi, '\n');
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

function isSafeImageSource(value: string) {
  const source = decodeHtmlEntities(value).trim();
  if (!source || source.startsWith('//') || source.includes('\\') || /[\u0000-\u001f\u007f]/.test(source)) {
    return false;
  }

  const scheme = source.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (scheme) {
    if (scheme !== 'https' || !/^https:\/\//i.test(source)) return false;
    try {
      const url = new URL(source);
      return Boolean(url.hostname) && !url.username && !url.password;
    } catch {
      return false;
    }
  }

  return !source.startsWith(':');
}

export function legacyHtmlPlainText(value: string | null | undefined) {
  return decodeHtmlEntities(sanitizeLegacyHtml(value).replace(/<[^>]+>/g, ' '))
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A brand description is meaningful when it contains enough readable text or
 * at least one image with a safe source. Empty TinyMCE wrappers do not qualify.
 */
export function hasMeaningfulLegacyHtml(
  value: string | null | undefined,
  minimumTextLength = 10,
) {
  const safeHtml = sanitizeLegacyHtml(value);
  if (legacyHtmlPlainText(safeHtml).length >= minimumTextLength) return true;

  const imagePattern = /<img\b([^>]*)>/gi;
  let match = imagePattern.exec(safeHtml);
  while (match) {
    const attributes = ` ${match[1] || ''}`;
    const sourceMatch = attributes.match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
    const source = sourceMatch?.[1] ?? sourceMatch?.[2] ?? sourceMatch?.[3] ?? '';
    if (isSafeImageSource(source)) return true;
    match = imagePattern.exec(safeHtml);
  }

  return false;
}
