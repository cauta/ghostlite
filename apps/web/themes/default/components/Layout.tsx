import Link from "next/link";
import type { LayoutProps } from "../../theme.types";
import ThemeToggle from "./ThemeToggle";

const TOGGLE_SCRIPT = `(function(){try{var s=localStorage.getItem('gl-theme');var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
const SYSTEM_SCRIPT = `(function(){try{var t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
const RESET_SCRIPT = `(function(){try{document.documentElement.removeAttribute('data-theme');}catch(e){}})();`;

export default function Layout({ site, user, theme, children }: LayoutProps) {
  const darkMode = (theme.config.darkMode as string | undefined) ?? "toggle";
  const initScript =
    darkMode === "off" ? RESET_SCRIPT : darkMode === "system" ? SYSTEM_SCRIPT : TOGGLE_SCRIPT;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: initScript }} />
      <div className="theme-default">
        <header className="theme-header">
          <div className="theme-container">
            <Link href="/" className="theme-brand">
              {site.logoUrl ? (
                <img src={site.logoUrl} alt={site.title} className="theme-logo" />
              ) : (
                <span className="theme-brand-text">{site.title}</span>
              )}
            </Link>
            <nav className="theme-nav">
              <Link href="/">Home</Link>
              <Link href="/about">About</Link>
              {user ? (
                <Link href="/admin" className="theme-dashboard-btn">
                  Go to Dashboard
                </Link>
              ) : null}
              {darkMode === "toggle" && <ThemeToggle />}
            </nav>
          </div>
        </header>
        <main className="theme-main">
          <div className="theme-container">{children}</div>
        </main>
        <footer className="theme-footer">
          <div className="theme-container">
            <p>
              © {new Date().getFullYear()} {site.title}
              {site.description ? ` — ${site.description}` : ""}
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
