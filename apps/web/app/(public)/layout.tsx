import { loadTheme } from "@/themes/loader";
import { getEnv } from "@/lib/cf";
import { getActiveThemeName, getSiteSettings } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const env = getEnv();
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

  if (theme.Layout) {
    return <theme.Layout {...ctx}>{children}</theme.Layout>;
  }
  return <>{children}</>;
}
