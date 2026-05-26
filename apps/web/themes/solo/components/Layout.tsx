import Link from "next/link";
import type { LayoutProps } from "../../theme.types";

// Solo theme — a newsletter-style single-column layout.
// Light-only design; clear the data-theme attribute set by the Default theme
// so the page background is always the Solo off-white, never Default's dark.
const RESET_THEME_SCRIPT = `(function(){try{document.documentElement.removeAttribute('data-theme');}catch(e){}})();`;

export default function Layout({ site, user, children }: LayoutProps) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: RESET_THEME_SCRIPT }} />
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
                <Link href="/">Posts</Link>
                <Link href="/about">About</Link>
                {user ? (
                  <Link href="/admin" className="sl-nav-cta">
                    Dashboard
                  </Link>
                ) : null}
              </nav>
            </div>
          </div>
        </header>

        <main className="sl-main">
          <div className="sl-outer">{children}</div>
        </main>

        <footer className="sl-footer">
          <div className="sl-outer">
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
