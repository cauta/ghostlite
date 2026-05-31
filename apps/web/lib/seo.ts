/**
 * Build a canonical URL for a public page.
 * Returns undefined when origin is not available, so callers can omit the tag.
 */
export function getCanonicalUrl(origin: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}
