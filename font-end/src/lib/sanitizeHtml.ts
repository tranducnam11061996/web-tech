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
