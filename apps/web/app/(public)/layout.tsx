import { loadTheme } from "@/themes/loader";
import { getEnv } from "@/lib/cf";
import { getActiveThemeName, getSiteSettings, getInjectionSettings } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const env = getEnv();
  const [themeName, site, user, injection] = await Promise.all([
    getActiveThemeName(env.DB),
    getSiteSettings(env.DB),
    getCurrentUser(),
    getInjectionSettings(env.DB),
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

  const head = (
    <>
      {injection.headCss ? <style dangerouslySetInnerHTML={{ __html: injection.headCss }} /> : null}
      {injection.headJs ? <script dangerouslySetInnerHTML={{ __html: injection.headJs }} /> : null}
    </>
  );

  const footer = injection.footerJs ? (
    <script dangerouslySetInnerHTML={{ __html: injection.footerJs }} />
  ) : null;

  if (theme.Layout) {
    return (
      <>
        {head}
        <theme.Layout {...ctx}>{children}</theme.Layout>
        {footer}
      </>
    );
  }
  return (
    <>
      {head}
      {children}
      {footer}
    </>
  );
}
