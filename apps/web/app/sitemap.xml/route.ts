import { type NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { getAllPublishedPostSlugs, getAllTagsWithPublishedPosts, getSiteSettings } from "@/lib/db";

export const runtime = "edge";

const KV_KEY = "sitemap-xml";
const KV_TTL = 3600; // 1 hour

function toW3CDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().split("T")[0];
}

function buildSitemap(baseUrl: string, posts: { slug: string; updated_at: number }[], tagSlugs: string[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    // Homepage
    "  <url>",
    `    <loc>${baseUrl}/</loc>`,
    "    <changefreq>daily</changefreq>",
    "    <priority>1.0</priority>",
    "  </url>",
  ];

  for (const post of posts) {
    lines.push(
      "  <url>",
      `    <loc>${baseUrl}/${post.slug}/</loc>`,
      `    <lastmod>${toW3CDate(post.updated_at)}</lastmod>`,
      "    <changefreq>weekly</changefreq>",
      "    <priority>0.8</priority>",
      "  </url>",
    );
  }

  for (const slug of tagSlugs) {
    lines.push(
      "  <url>",
      `    <loc>${baseUrl}/tag/${slug}/</loc>`,
      "    <changefreq>weekly</changefreq>",
      "    <priority>0.5</priority>",
      "  </url>",
    );
  }

  lines.push("</urlset>");
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const env = getEnv();

  // Try KV cache first
  const cached = await env.KV.get(KV_KEY);
  if (cached) {
    return new NextResponse(cached, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }

  // Derive base URL from request (respects custom domain / Pages domain)
  const reqUrl = new URL(req.url);
  const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;

  const [posts, tagSlugs, site] = await Promise.all([
    getAllPublishedPostSlugs(env.DB),
    getAllTagsWithPublishedPosts(env.DB),
    getSiteSettings(env.DB),
  ]);

  // site settings may have a url override in the future; fall back to reqUrl
  const siteBase = (site as { url?: string }).url
    ? ((site as { url?: string }).url as string).replace(/\/$/, "")
    : baseUrl;

  const xml = buildSitemap(siteBase, posts, tagSlugs);

  // Cache in KV (fire-and-forget)
  env.KV.put(KV_KEY, xml, { expirationTtl: KV_TTL }).catch(() => {});

  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
