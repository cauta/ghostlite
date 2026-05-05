import Link from "next/link";
import type { HomePageProps } from "../../theme.types";
import PostCard from "../components/PostCard";

export default function HomePage({ posts, page, totalPages }: HomePageProps) {
  return (
    <div className="theme-home">
      {posts.length === 0 ? (
        <p className="theme-empty">No posts published yet.</p>
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
            <Link href={page === 2 ? "/" : `/?page=${page - 1}`}>← Newer</Link>
          ) : (
            <span />
          )}
          <span className="theme-page-indicator">
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
