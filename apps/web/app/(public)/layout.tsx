import { loadTheme } from "@/themes/loader";
import { getEnv } from "@/lib/cf";
import { getActiveThemeName, getSiteSettings } from "@/lib/db";

export const runtime = "edge";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const env = getEnv();
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

  if (theme.Layout) {
    return <theme.Layout {...ctx}>{children}</theme.Layout>;
  }
  return <>{children}</>;
}
