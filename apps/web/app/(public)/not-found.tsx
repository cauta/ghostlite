import Link from "next/link";
import { loadTheme } from "@/themes/loader";
import { getEnv } from "@/lib/cf";
import { getActiveThemeName, getSiteSettings } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";

export default async function NotFound() {
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
    navigation: { primary: [], secondary: [] },
  };

  if (theme.pages.NotFound) {
    return <theme.pages.NotFound {...ctx} />;
  }

  return (
    <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <h1 style={{ fontSize: "4rem", fontWeight: 700, margin: "0 0 0.5rem" }}>404</h1>
      <p style={{ fontSize: "1.25rem", marginBottom: "2rem" }}>
        Page not found
      </p>
      <Link href="/" style={{ textDecoration: "underline" }}>
        ← Back to home
      </Link>
    </div>
  );
}
