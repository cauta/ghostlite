const SRCSET_WIDTHS = [480, 800, 1200, 1600];
const SRCSET_SIZES = "(max-width: 640px) 100vw, 800px";

export function buildSrcSet(url: string): string {
  return SRCSET_WIDTHS.map((w) => `${url}?w=${w} ${w}w`).join(", ");
}

/**
 * Post-processes rendered HTML to add `srcset` and `sizes` attributes to
 * any <img> whose src points at /api/media/. Safe to call on HTML that
 * already has srcset (skips those tags).
 */
export function rewriteBodyImages(html: string): string {
  return html.replace(
    /<img([^>]*)\ssrc="(\/api\/media\/[^"?]+)"([^>]*)>/gi,
    (_match, before: string, src: string, after: string) => {
      if (before.includes("srcset") || after.includes("srcset")) return _match;
      const srcset = buildSrcSet(src);
      return `<img${before} src="${src}" srcset="${srcset}" sizes="${SRCSET_SIZES}"${after}>`;
    },
  );
}
