import Link from "next/link";
import type { PostSummary } from "../../theme.types";
import { formatDate, isoDate } from "../format";

// Large hero treatment for the newest story on page 1 of the home page.
export default function FeaturePost({ post }: { post: PostSummary }) {
  return (
    <article className="ed-feature">
      <Link href={`/${post.slug}`} className="ed-feature-media" aria-hidden tabIndex={-1}>
        {post.coverUrl ? (
          <img src={post.coverUrl} alt="" className="ed-feature-cover" />
        ) : (
          <div className="ed-feature-cover ed-cover-empty" />
        )}
      </Link>
      <div className="ed-feature-body">
        <p className="ed-kicker">Featured story</p>
        <h2 className="ed-feature-title">
          <Link href={`/${post.slug}`}>{post.title}</Link>
        </h2>
        {post.excerpt ? <p className="ed-feature-excerpt">{post.excerpt}</p> : null}
        <p className="ed-byline">
          <span>{post.author.name}</span>
          <span aria-hidden> · </span>
          <time dateTime={isoDate(post.publishedAt)}>{formatDate(post.publishedAt)}</time>
        </p>
      </div>
    </article>
  );
}
