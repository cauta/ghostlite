import Link from "next/link";
import type { PostSummary } from "../../theme.types";

// Formats a Unix epoch (seconds) into a compact "Jan 2026" string.
function shortDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

// A single row in the home-page post list. Shows title + optional excerpt
// on the left, and the publish date on the right. The entire row is a link
// so the click target is large.
export default function PostListItem({ post }: { post: PostSummary }) {
  return (
    <li className="sl-post-item">
      <Link href={`/${post.slug}`} className="sl-post-item-inner">
        <div className="sl-item-left">
          <p className="sl-item-title">{post.title}</p>
          {post.excerpt ? (
            <p className="sl-item-excerpt">{post.excerpt}</p>
          ) : null}
        </div>
        <time
          className="sl-item-meta"
          dateTime={new Date(post.publishedAt * 1000).toISOString()}
        >
          {shortDate(post.publishedAt)}
        </time>
      </Link>
    </li>
  );
}
