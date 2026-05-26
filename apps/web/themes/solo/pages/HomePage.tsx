import Link from "next/link";
import type { HomePageProps } from "../../theme.types";
import PostListItem from "../components/PostListItem";

// The Solo home page is a clean chronological list — title + excerpt + date.
// No cover images in the list; the writing leads.
export default function HomePage({
  site,
  posts,
  page,
  totalPages,
}: HomePageProps) {
  return (
    <div className="sl-prose">
      {/* Show the blog description as a subtle intro only on page 1 */}
      {page === 1 && site.description ? (
        <div className="sl-home-header">
          <p className="sl-home-title">{site.title}</p>
          <p className="sl-home-desc">{site.description}</p>
        </div>
      ) : null}

      {posts.length === 0 ? (
        <p className="sl-empty">No posts published yet.</p>
      ) : (
        <ul className="sl-post-list">
          {posts.map((p) => (
            <PostListItem key={p.id} post={p} />
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav className="sl-pagination" aria-label="Pagination">
          {page > 1 ? (
            <Link href={page === 2 ? "/" : `/?page=${page - 1}`}>← Newer</Link>
          ) : (
            <span />
          )}
          <span>
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
