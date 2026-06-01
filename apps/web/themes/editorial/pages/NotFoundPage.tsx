import Link from "next/link";
import type { ThemeContext } from "../../theme.types";

export default function NotFoundPage({ site }: ThemeContext) {
  return (
    <div className="ed-not-found">
      <p className="ed-kicker">404</p>
      <h1 className="ed-not-found-title">Page not found</h1>
      <p className="ed-not-found-desc">
        Sorry, the page you were looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className="ed-not-found-link">
        ← Back to {site.title}
      </Link>
    </div>
  );
}
