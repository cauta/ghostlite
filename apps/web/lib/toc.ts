export type TocEntry = { id: string; text: string; level: 2 | 3 };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Parses HTML for h2/h3 headings, injects `id` attributes, and returns the
 * modified HTML alongside a TOC array. Called server-side before caching.
 */
export function buildToc(html: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  const slugCount = new Map<string, number>();

  const result = html.replace(
    /<(h[23])([^>]*)>([\s\S]*?)<\/h[23]>/gi,
    (_match, tag: string, attrs: string, inner: string) => {
      const level = parseInt(tag[1], 10) as 2 | 3;
      const text = inner.replace(/<[^>]+>/g, "").trim();
      if (!text) return _match;

      const base = slugify(text) || "heading";
      const count = slugCount.get(base) ?? 0;
      const id = count === 0 ? base : `${base}-${count}`;
      slugCount.set(base, count + 1);

      toc.push({ id, text, level });

      // Remove any existing id attribute then add ours
      const cleanAttrs = attrs.replace(/\s*id="[^"]*"/gi, "");
      return `<${tag}${cleanAttrs} id="${id}">${inner}</${tag}>`;
    },
  );

  return { html: result, toc };
}
