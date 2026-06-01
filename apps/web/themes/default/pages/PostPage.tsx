import Link from "next/link";
import type { PostPageProps } from "../../theme.types";
import { ShareBar } from "../../shared/ShareBar";

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PostPage({ post, canonicalUrl }: PostPageProps) {
  return (
    <article className="theme-post">
      <header className="theme-post-header">
        <h1>{post.title}</h1>
        <div className="theme-post-meta">
          <span>{post.author.name}</span>
          <span aria-hidden>·</span>
          <time dateTime={new Date(post.publishedAt * 1000).toISOString()}>
            {fmtDate(post.publishedAt)}
          </time>
        </div>
        {post.tags.length > 0 ? (
          <div className="theme-post-tags">
            {post.tags.map((t) => (
              <Link key={t.slug} href={`/tag/${t.slug}`} className="theme-tag">
                {t.name}
              </Link>
            ))}
          </div>
        ) : null}
        {post.coverUrl ? (
          <img src={post.coverUrl} alt="" className="theme-post-cover-full" />
        ) : null}
      </header>
      <div
        className="theme-post-body"
        dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
      />
      <ShareBar
        url={canonicalUrl}
        title={post.title}
        className="theme-share-bar"
        linkClassName="theme-share-link"
        copyClassName="theme-share-link"
      />
    </article>
  );
}
