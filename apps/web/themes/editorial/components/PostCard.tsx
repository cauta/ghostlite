import Link from "next/link";
import type { PostSummary } from "../../theme.types";
import { formatDate, isoDate } from "../format";

// Standard story card used in the home and tag grids.
export default function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="ed-card">
      <Link href={`/${post.slug}`} className="ed-card-media" aria-hidden tabIndex={-1}>
        {post.coverUrl ? (
          <img src={post.coverUrl} srcSet={post.coverSrcSet ?? undefined} sizes="(max-width: 640px) 100vw, 480px" alt="" className="ed-card-cover" loading="lazy" />
        ) : (
          <div className="ed-card-cover ed-cover-empty" />
        )}
      </Link>
      <div className="ed-card-body">
        <h3 className="ed-card-title">
          <Link href={`/${post.slug}`}>{post.title}</Link>
        </h3>
        {post.excerpt ? <p className="ed-card-excerpt">{post.excerpt}</p> : null}
        <p className="ed-byline">
          <span>{post.author.name}</span>
          <span aria-hidden> · </span>
          <time dateTime={isoDate(post.publishedAt)}>{formatDate(post.publishedAt)}</time>
        </p>
      </div>
    </article>
  );
}
