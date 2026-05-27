import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { loadTheme } from "@/themes/loader";
import { getEnv } from "@/lib/cf";
import { getActiveThemeName, getSiteSettings, listPostsByTag } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";

function getOrigin(): string {
  const headersList = headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const env = getEnv();
  const [data, site] = await Promise.all([
    listPostsByTag(env.DB, params.slug),
    getSiteSettings(env.DB),
  ]);
  if (!data) return {};

  const origin = getOrigin();
  const logoUrl = site.logo_key ? `${origin}/api/media/${site.logo_key}` : undefined;
  const tagTitle = `${data.tag.name} — ${site.title}`;
  const description = `Posts tagged "${data.tag.name}" on ${site.title}`;

  return {
    title: tagTitle,
    description,
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
  const data = await listPostsByTag(env.DB, params.slug);
  if (!data) notFound();

  const [themeName, site, user] = await Promise.all([
    getActiveThemeName(env.DB),
    getSiteSettings(env.DB),
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
