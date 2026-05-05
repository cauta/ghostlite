// Minimal markdown -> HTML renderer.
//
// We deliberately avoid pulling in a 100KB+ markdown library for v1. This
// covers what a blog post needs: headings, paragraphs, bold/italic, code
// blocks, inline code, links, lists, blockquotes, images, hr.
//
// Output is escaped before formatting, so it's safe against script injection
// in user-authored content. If you need GFM tables, footnotes, or syntax
// highlighting, swap this for `marked` + `dompurify` later — the call site
// in routes won't change.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  let s = escapeHtml(text);
  // Inline code first so its contents don't get re-formatted
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  // Images: ![alt](url)
  s = s.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]+)&quot;)?\)/g,
    (_, alt, url, title) =>
      `<img src="${url}" alt="${alt}"${title ? ` title="${title}"` : ""} loading="lazy" />`,
  );
  // Links: [text](url)
  s = s.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, t, url) => `<a href="${url}">${t}</a>`,
  );
  // Bold ** **
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic * *
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return s;
}

export function renderMarkdown(md: string): string {
  if (!md) return "";
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  let i = 0;
  let para: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let inCode = false;
  let codeLang = "";
  let codeBuf: string[] = [];
  let inQuote = false;
  let quoteBuf: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${renderInline(para.join(" "))}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  const flushQuote = () => {
    if (inQuote) {
      out.push(`<blockquote>${renderInline(quoteBuf.join(" "))}</blockquote>`);
      quoteBuf = [];
      inQuote = false;
    }
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.replace(/\s+$/, "");

    // Code fence
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      if (inCode) {
        out.push(
          `<pre><code${codeLang ? ` class="language-${codeLang}"` : ""}>${escapeHtml(codeBuf.join("\n"))}</code></pre>`,
        );
        inCode = false;
        codeLang = "";
        codeBuf = [];
      } else {
        flushPara();
        flushList();
        flushQuote();
        inCode = true;
        codeLang = fence[1] ?? "";
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      i++;
      continue;
    }

    // Blank line: paragraph break
    if (line.trim() === "") {
      flushPara();
      flushList();
      flushQuote();
      i++;
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      flushList();
      flushQuote();
      const level = h[1].length;
      out.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      flushPara();
      flushList();
      flushQuote();
      out.push("<hr />");
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      flushPara();
      flushList();
      inQuote = true;
      quoteBuf.push(line.replace(/^>\s?/, ""));
      i++;
      continue;
    } else if (inQuote) {
      flushQuote();
    }

    // Lists
    const ul = line.match(/^[-*]\s+(.*)$/);
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      const t: "ul" | "ol" = ul ? "ul" : "ol";
      if (listType !== t) {
        flushList();
        listType = t;
        out.push(`<${t}>`);
      }
      out.push(`<li>${renderInline((ul?.[1] ?? ol?.[1])!)}</li>`);
      i++;
      continue;
    } else if (listType) {
      flushList();
    }

    // Paragraph accumulator
    para.push(line);
    i++;
  }

  flushPara();
  flushList();
  flushQuote();
  if (inCode) out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);

  return out.join("\n");
}
