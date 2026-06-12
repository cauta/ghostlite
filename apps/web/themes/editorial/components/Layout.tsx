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
    : [{ label: "Latest", url: "/" }];

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: initScript }} />
      <div className="theme-editorial">
        <header className="ed-header">
          <div className="ed-container">
            <Link href="/" className="ed-masthead">
              {site.logoUrl ? (
                <img src={site.logoUrl} alt={site.title} className="ed-logo" />
              ) : (
                <span className="ed-masthead-title">{site.title}</span>
              )}
            </Link>
            {site.description ? (
              <p className="ed-masthead-tagline">{site.description}</p>
            ) : null}
            <nav className="ed-nav">
              {primaryNav.map((item) => (
                <Link key={item.url} href={item.url}>{item.label}</Link>
              ))}
              {user ? (
                <Link href="/admin" className="ed-nav-cta">
                  Dashboard
                </Link>
              ) : null}
              {darkMode === "toggle" && (
                <ThemeToggle
                  classes={{
                    button: "ed-mode-toggle",
                    moon: "ed-icon-moon",
                    sun: "ed-icon-sun",
                  }}
                />
              )}
            </nav>
          </div>
        </header>

        <main className="ed-main">
          <div className="ed-container">{children}</div>
        </main>

        <footer className="ed-footer">
          <div className="ed-container">
            {navigation.secondary.length > 0 ? (
              <nav className="ed-footer-nav">
                {navigation.secondary.map((item) => (
                  <Link key={item.url} href={item.url}>{item.label}</Link>
                ))}
              </nav>
            ) : null}
            <p>
              © {new Date().getFullYear()} {site.title}
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
