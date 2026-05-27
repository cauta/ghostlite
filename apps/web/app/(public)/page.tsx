import { loadTheme } from "@/themes/loader";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getEnv } from "@/lib/cf";
import { getActiveThemeName, getSiteSettings, listPublishedPosts } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";

function getOrigin(): string {
  const headersList = headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const env = getEnv();
  const site = await getSiteSettings(env.DB);
  const origin = getOrigin();
  const logoUrl = site.logo_key ? `${origin}/api/media/${site.logo_key}` : undefined;

  return {
    title: site.title,
    description: site.description || undefined,
    openGraph: {
      type: "website",
      title: site.title,
      description: site.description || undefined,
      url: `${origin}/`,
      siteName: site.title,
      images: logoUrl ? [{ url: logoUrl }] : undefined,
    },
    twitter: {
      card: "summary",
      title: site.title,
      description: site.description || undefined,
      images: logoUrl ? [logoUrl] : undefined,
    },
    alternates: {
      types: {
        "application/rss+xml": `${origin}/rss/`,
      },
    },
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const env = getEnv();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const [themeName, site, listing, user] = await Promise.all([
    getActiveThemeName(env.DB),
    getSiteSettings(env.DB),
    listPublishedPosts(env.DB, { page, perPage: 10 }),
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

  return (
    <theme.pages.Home
      {...ctx}
      posts={listing.posts}
      page={listing.page}
      totalPages={listing.totalPages}
    />
  );
}
