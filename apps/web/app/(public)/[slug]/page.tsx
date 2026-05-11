import { notFound } from "next/navigation";
import { loadTheme } from "@/themes/loader";
import { getEnv } from "@/lib/cf";
import {
  getActiveThemeName,
  getPublishedPostBySlug,
  getSiteSettings,
  rowToPostFull,
} from "@/lib/db";
import { readPostBody } from "@/lib/storage";
import { renderMarkdown } from "@/lib/markdown";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";

export default async function PostBySlug({ params }: { params: { slug: string } }) {
  const env = getEnv();
  const result = await getPublishedPostBySlug(env.DB, params.slug);
  if (!result) notFound();

  const [themeName, site, body, user] = await Promise.all([
    getActiveThemeName(env.DB),
    getSiteSettings(env.DB),
    readPostBody(env.R2, result.row.body_key),
    getCurrentUser(),
  ]);
  const theme = await loadTheme(themeName);

  // Cache rendered HTML in KV. Key includes updated_at so an edit busts cache.
  const cacheKey = `post-html:${result.row.id}:${result.row.published_at}`;
  let bodyHtml = await env.KV.get(cacheKey);
  if (!bodyHtml) {
    bodyHtml = renderMarkdown(body);
    // Fire and forget; don't block render on cache write
    env.KV.put(cacheKey, bodyHtml, { expirationTtl: 3600 }).catch(() => {});
  }

  const post = rowToPostFull(result.row, bodyHtml, result.tags);
  const ctx = {
    site: {
      title: site.title,
      description: site.description,
      logoUrl: site.logo_key ? `/api/media/${site.logo_key}` : null,
    },
    theme: { config: {} },
    user: user ? { name: user.name, role: user.role } : null,
  };

  return <theme.pages.Post {...ctx} post={post} />;
}
