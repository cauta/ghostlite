import type { TagPageProps } from "../../theme.types";
import PostCard from "../components/PostCard";

export default function TagPage({ tag, posts }: TagPageProps) {
  return (
    <div className="ed-tag-page">
      <header className="ed-tag-header">
        <p className="ed-kicker">Collection</p>
        <h1 className="ed-tag-title">{tag.name}</h1>
        <p className="ed-tag-count">
          {posts.length} {posts.length === 1 ? "story" : "stories"}
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="ed-empty">No stories in this collection yet.</p>
      ) : (
        <div className="ed-grid">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
