import { notFound } from "next/navigation";
import { loadTheme } from "@/themes/loader";
import { getEnv } from "@/lib/cf";
import { getActiveThemeName, getSiteSettings, listPostsByTag } from "@/lib/db";

export const runtime = "edge";

export default async function TagPage({ params }: { params: { slug: string } }) {
  const env = getEnv();
  const data = await listPostsByTag(env.DB, params.slug);
  if (!data) notFound();

  const [themeName, site] = await Promise.all([
    getActiveThemeName(env.DB),
    getSiteSettings(env.DB),
  ]);
  const theme = await loadTheme(themeName);

  const ctx = {
    site: {
      title: site.title,
      description: site.description,
      logoUrl: site.logo_key ? `/api/media/${site.logo_key}` : null,
    },
    theme: { config: {} },
  };

  return <theme.pages.Tag {...ctx} tag={data.tag} posts={data.posts} />;
}
