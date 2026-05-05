import Link from "next/link";
import type { LayoutProps } from "../../theme.types";

export default function Layout({ site, children }: LayoutProps) {
  return (
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
  );
}
