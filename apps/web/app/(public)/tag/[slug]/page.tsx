import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadTheme } from "@/themes/loader";
import { getEnv, getOrigin } from "@/lib/cf";
import { getActiveThemeName, getSiteSettings, listPostsByTag } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCanonicalUrl } from "@/lib/seo";

export const runtime = "edge";

const getSiteSettingsCached = cache(getSiteSettings);
const listPostsByTagCached = cache(listPostsByTag);

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const env = getEnv();
  const [data, site] = await Promise.all([
    listPostsByTagCached(env.DB, params.slug),
    getSiteSettingsCached(env.DB),
  ]);
  if (!data) return {};

  const origin = getOrigin();
  const logoUrl = site.logo_key ? `${origin}/api/media/${site.logo_key}` : undefined;
  const tagTitle = `${data.tag.name} — ${site.title}`;
  const description = `Posts tagged "${data.tag.name}" on ${site.title}`;

  return {
    title: tagTitle,
    description,
    alternates: {
      canonical: getCanonicalUrl(origin, `/tag/${data.tag.slug}/`),
    },
    openGraph: {
      type: "website",
      title: tagTitle,
      description,
      url: `${origin}/tag/${data.tag.slug}/`,
      siteName: site.title,
      images: logoUrl ? [{ url: logoUrl }] : undefined,
    },
    twitter: {
      card: "summary",
      title: tagTitle,
      description,
      images: logoUrl ? [logoUrl] : undefined,
    },
  };
}

export default async function TagPage({ params }: { params: { slug: string } }) {
  const env = getEnv();
  const data = await listPostsByTagCached(env.DB, params.slug);
  if (!data) notFound();

  const [themeName, site, user] = await Promise.all([
    getActiveThemeName(env.DB),
    getSiteSettingsCached(env.DB),
    getCurrentUser(),
  ]);
  const theme = await loadTheme(themeName);

  const ctx = {
    site: {
      title: site.title,
      description: site.description,
      logoUrl: site.logo_key ? `/api/media/${site.logo_key}` : null,
    },
    theme: { config: {} },
    user: user ? { name: user.name, role: user.role } : null,
  };

  return <theme.pages.Tag {...ctx} tag={data.tag} posts={data.posts} />;
}
