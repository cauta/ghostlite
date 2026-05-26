import Link from "next/link";
import type { LayoutProps } from "../../theme.types";

// The Default theme persists a light/dark choice on <html data-theme>.
// Editorial is a single, light design, so on load we clear that attribute —
// otherwise a reader arriving from the Default theme in dark mode would see
// a dark page background behind Editorial's light layout.
const RESET_THEME_SCRIPT = `(function(){try{document.documentElement.removeAttribute('data-theme');}catch(e){}})();`;

export default function Layout({ site, user, children }: LayoutProps) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: RESET_THEME_SCRIPT }} />
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
              <Link href="/">Latest</Link>
              <Link href="/about">About</Link>
              {user ? (
                <Link href="/admin" className="ed-nav-cta">
                  Dashboard
                </Link>
              ) : null}
            </nav>
          </div>
        </header>

        <main className="ed-main">
          <div className="ed-container">{children}</div>
        </main>

        <footer className="ed-footer">
          <div className="ed-container">
            <p>
              © {new Date().getFullYear()} {site.title}
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
