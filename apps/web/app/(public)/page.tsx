import { loadTheme } from "@/themes/loader";
import { getEnv } from "@/lib/cf";
import { getActiveThemeName, getSiteSettings, listPublishedPosts } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";

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
