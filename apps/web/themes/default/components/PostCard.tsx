import Link from "next/link";
import type { PostSummary } from "../../theme.types";

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="theme-post-card">
      {post.coverUrl ? (
        <Link href={`/${post.slug}`} className="theme-post-cover-link">
          <img src={post.coverUrl} srcSet={post.coverSrcSet ?? undefined} sizes="(max-width: 640px) 100vw, 480px" alt="" className="theme-post-cover" loading="lazy" />
        </Link>
      ) : null}
      <div className="theme-post-card-body">
        <h2 className="theme-post-title">
          <Link href={`/${post.slug}`}>{post.title}</Link>
        </h2>
        {post.excerpt ? <p className="theme-post-excerpt">{post.excerpt}</p> : null}
        <div className="theme-post-meta">
          <span>{post.author.name}</span>
          <span aria-hidden>·</span>
          <time dateTime={new Date(post.publishedAt * 1000).toISOString()}>
            {fmtDate(post.publishedAt)}
          </time>
        </div>
      </div>
    </article>
  );
}
