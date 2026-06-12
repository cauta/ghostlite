import Link from "next/link";
import type { LayoutProps } from "../../theme.types";
import { ThemeToggle } from "../../shared/ThemeToggle";

const TOGGLE_SCRIPT = `(function(){try{var s=localStorage.getItem('gl-theme');var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
const SYSTEM_SCRIPT = `(function(){try{var t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
const RESET_SCRIPT = `(function(){try{document.documentElement.removeAttribute('data-theme');}catch(e){}})();`;

export default function Layout({ site, user, theme, navigation, children }: LayoutProps) {
  const darkMode = (theme.config.darkMode as string | undefined) ?? "toggle";
  const initScript =
    darkMode === "off" ? RESET_SCRIPT : darkMode === "system" ? SYSTEM_SCRIPT : TOGGLE_SCRIPT;
  const primaryNav = navigation.primary.length > 0
    ? navigation.primary
    : [{ label: "Posts", url: "/" }];

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: initScript }} />
      <div className="theme-solo">
        <header className="sl-header">
          <div className="sl-outer">
            <div className="sl-header-inner">
              {/* Brand / logo */}
              <Link href="/" className="sl-brand">
                {site.logoUrl ? (
                  <img src={site.logoUrl} alt={site.title} className="sl-logo" />
                ) : (
                  site.title
                )}
              </Link>

              {/* Navigation */}
              <nav className="sl-nav" aria-label="Site navigation">
                {primaryNav.map((item) => (
                  <Link key={item.url} href={item.url}>{item.label}</Link>
                ))}
                {user ? (
                  <Link href="/admin" className="sl-nav-cta">
                    Dashboard
                  </Link>
                ) : null}
                {darkMode === "toggle" && (
                  <ThemeToggle
                    classes={{
                      button: "sl-mode-toggle",
                      moon: "sl-icon-moon",
                      sun: "sl-icon-sun",
                    }}
                  />
                )}
              </nav>
            </div>
          </div>
        </header>

        <main className="sl-main">
          <div className="sl-outer">{children}</div>
        </main>

        <footer className="sl-footer">
          <div className="sl-outer">
            {navigation.secondary.length > 0 ? (
              <nav className="sl-footer-nav">
                {navigation.secondary.map((item) => (
                  <Link key={item.url} href={item.url}>{item.label}</Link>
                ))}
              </nav>
            ) : null}
            <div className="sl-footer-inner">
              <span>© {new Date().getFullYear()} {site.title}</span>
              {site.description ? <span>{site.description}</span> : null}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
