import Link from "next/link";
import type { LayoutProps } from "../../theme.types";
import ThemeToggle from "./ThemeToggle";

// Runs before first paint: applies the saved theme (or the OS preference)
// to <html> so dark mode never flashes on load.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('gl-theme');var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function Layout({ site, user, children }: LayoutProps) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
              <ThemeToggle />
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
