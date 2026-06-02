import Link from "next/link";
import type { ThemeContext } from "../../theme.types";

export default function NotFoundPage({ site }: ThemeContext) {
  return (
    <div className="theme-not-found">
      <p className="theme-not-found-code">404</p>
      <h1 className="theme-not-found-title">Page not found</h1>
      <p className="theme-not-found-desc">
        Sorry, the page you were looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className="theme-not-found-link">
        ← Back to {site.title}
      </Link>
    </div>
  );
}
