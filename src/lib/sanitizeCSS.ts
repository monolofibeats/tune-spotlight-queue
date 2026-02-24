/**
 * Sanitize user-provided CSS to prevent XSS and data exfiltration attacks.
 * Uses an allowlist approach for properties and blocks dangerous patterns.
 */

const DANGEROUS_PATTERNS = [
  /expression\s*\(/gi,
  /-moz-binding\s*:/gi,
  /behavior\s*:/gi,
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /@import/gi,
  /@charset/gi,
  /@namespace/gi,
  /url\s*\(/gi,            // Block all url() values (used for data exfiltration)
  /var\s*\(\s*--[^)]*url/gi,
];

const ALLOWED_AT_RULES = ['media', 'keyframes', '-webkit-keyframes'];

/**
 * Strips dangerous CSS constructs from a raw CSS string.
 * Returns a safe CSS string or empty string if input is invalid.
 */
export function sanitizeCSS(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';

  let css = raw;

  // Remove HTML tags that could break out of <style>
  css = css.replace(/<\/?[^>]+(>|$)/g, '');

  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    css = css.replace(pattern, '/* blocked */');
  }

  // Remove @rules that aren't in the allowlist
  css = css.replace(/@([a-z-]+)/gi, (match, ruleName) => {
    if (ALLOWED_AT_RULES.includes(ruleName.toLowerCase())) {
      return match;
    }
    return '/* blocked */';
  });

  // Remove any remaining </style> closing tags that could escape the style element
  css = css.replace(/<\/style/gi, '/* blocked */');

  return css;
}
