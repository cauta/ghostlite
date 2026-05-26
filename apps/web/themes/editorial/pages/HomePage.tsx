import Link from "next/link";
import type { HomePageProps } from "../../theme.types";
import FeaturePost from "../components/FeaturePost";
import PostCard from "../components/PostCard";

export default function HomePage({ posts, page, totalPages }: HomePageProps) {
  if (posts.length === 0) {
    return <p className="ed-empty">No stories published yet.</p>;
  }

  // The newest story gets the hero treatment on page 1 only; later pages of
  // the archive are a plain grid.
  const showFeature = page === 1;
  const feature = showFeature ? posts[0] : null;
  const rest = showFeature ? posts.slice(1) : posts;

  return (
    <div className="ed-home">
      {feature ? <FeaturePost post={feature} /> : null}

      {rest.length > 0 ? (
        <section>
          <h2 className="ed-section-heading">
            <span>{showFeature ? "More stories" : "Stories"}</span>
          </h2>
          <div className="ed-grid">
            {rest.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      ) : null}

      {totalPages > 1 ? (
        <nav className="ed-pagination">
          {page > 1 ? (
            <Link href={page === 2 ? "/" : `/?page=${page - 1}`}>← Newer</Link>
          ) : (
            <span />
          )}
          <span className="ed-page-indicator">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={`/?page=${page + 1}`}>Older →</Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
