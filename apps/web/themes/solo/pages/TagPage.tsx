import Link from "next/link";
import type { TagPageProps } from "../../theme.types";
import PostListItem from "../components/PostListItem";

// Tag archive page — same list layout as the home page, with a tag header.
export default function TagPage({ tag, posts, page, totalPages }: TagPageProps) {
  return (
    <div className="sl-prose">
      <header className="sl-tag-header">
        <p className="sl-tag-label">Tag</p>
        <h1 className="sl-tag-name">{tag.name}</h1>
        <Link href="/" className="sl-tag-back">
          ← All posts
        </Link>
      </header>

      {posts.length === 0 ? (
        <p className="sl-empty">No posts in this tag yet.</p>
      ) : (
        <ul className="sl-post-list">
          {posts.map((p) => (
            <PostListItem key={p.id} post={p} />
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav className="sl-pagination">
          {page > 1 ? (
            <Link
              href={page === 2 ? `/tag/${tag.slug}/` : `/tag/${tag.slug}/?page=${page - 1}`}
              className="sl-pagination-link"
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="sl-pagination-indicator">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={`/tag/${tag.slug}/?page=${page + 1}`} className="sl-pagination-link">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
