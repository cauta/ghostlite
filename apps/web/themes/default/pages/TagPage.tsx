import Link from "next/link";
import type { TagPageProps } from "../../theme.types";
import PostCard from "../components/PostCard";

export default function TagPage({ tag, posts, page, totalPages }: TagPageProps) {
  return (
    <div className="theme-tag-page">
      <header className="theme-tag-header">
        <h1>Posts tagged &ldquo;{tag.name}&rdquo;</h1>
      </header>
      {posts.length === 0 ? (
        <p className="theme-empty">No posts with this tag yet.</p>
      ) : (
        <div className="theme-post-list">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
      {totalPages > 1 ? (
        <nav className="theme-pagination">
          {page > 1 ? (
            <Link
              href={page === 2 ? `/tag/${tag.slug}/` : `/tag/${tag.slug}/?page=${page - 1}`}
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="theme-page-indicator">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={`/tag/${tag.slug}/?page=${page + 1}`}>Older →</Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
