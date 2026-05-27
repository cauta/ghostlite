import { type NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { getRecentPublishedPosts, getSiteSettings } from "@/lib/db";
import { readPostBody } from "@/lib/storage";

export const runtime = "edge";

const RSS_KV_KEY = "rss:feed";
const RSS_KV_TTL = 15 * 60; // 15 minutes

/** Convert a Unix epoch (seconds) to an RFC 822 date string for RSS. */
function toRfc822(epoch: number): string {
  return new Date(epoch * 1000).toUTCString();
}

/** Escape XML special characters inside CDATA (belt-and-suspenders). */
function escapeCdata(str: string): string {
  // CDATA ends at "]]>" — replace with entity to be safe
  return str.replace(/]]>/g, "]]&gt;");
}

function buildFeed(
  siteUrl: string,
  title: string,
  description: string,
  items: Array<{
    slug: string;
    title: string;
    excerpt: string | null;
    bodyHtml: string;
    publishedAt: number;
    authorName: string;
  }>,
): string {
  const lastBuildDate = items.length > 0 ? toRfc822(items[0].publishedAt) : toRfc822(Math.floor(Date.now() / 1000));

  const itemXml = items
    .map((item) => {
      const url = `${siteUrl}/${item.slug}/`;
      const content = item.bodyHtml || (item.excerpt ?? "");
      return `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description><![CDATA[${escapeCdata(content)}]]></description>
      <pubDate>${toRfc822(item.publishedAt)}</pubDate>
      <author>${escapeXml(item.authorName)}</author>
    </item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${siteUrl}/</link>
    <description>${escapeXml(description)}</description>
    <atom:link href="${siteUrl}/rss/" rel="self" type="application/rss+xml" />
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>${itemXml}
  </channel>
</rss>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(_req: NextRequest) {
  const env = getEnv();

  // Try KV cache first
  const cached = await env.KV.get(RSS_KV_KEY);
  if (cached) {
    return new NextResponse(cached, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=900",
        "X-Cache": "HIT",
      },
    });
  }

  // Build the feed
  const [site, posts] = await Promise.all([
    getSiteSettings(env.DB),
    getRecentPublishedPosts(env.DB, 15),
  ]);

  // Determine site URL from settings or fall back to a safe default
  const siteUrl = ((site as unknown as { url?: string }).url ?? "").replace(/\/$/, "") || "https://example.com";

  // Fetch post bodies from R2
  const items = await Promise.all(
    posts.map(async (post) => {
      const bodyHtml = await readPostBody(env.R2, post.body_key);
      return {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        bodyHtml,
        publishedAt: post.published_at,
        authorName: post.author_name,
      };
    }),
  );

  const xml = buildFeed(siteUrl, site.title, site.description, items);

  // Cache in KV (fire and forget)
  env.KV.put(RSS_KV_KEY, xml, { expirationTtl: RSS_KV_TTL }).catch(() => {});

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900",
      "X-Cache": "MISS",
    },
  });
}
