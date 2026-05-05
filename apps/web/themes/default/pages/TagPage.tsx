import type { TagPageProps } from "../../theme.types";
import PostCard from "../components/PostCard";

export default function TagPage({ tag, posts }: TagPageProps) {
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
    </div>
  );
}
