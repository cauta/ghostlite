import Link from "next/link";
import type { PostPageProps } from "../../theme.types";
import { ShareBar } from "../../shared/ShareBar";
import { CommentsSection } from "../../shared/CommentsSection";
import PostListItem from "../components/PostListItem";

// Formats a Unix epoch (seconds) into a human-readable date string.
function longDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isoDate(ts: number): string {
  return new Date(ts * 1000).toISOString();
}

// Returns the one or two initials from a name for the avatar fallback.
function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export default function PostPage({ post, canonicalUrl, relatedPosts, comments, commentPostUrl, pageType }: PostPageProps) {
  const primaryTag = post.tags[0] ?? null;

  return (
    <div className="sl-prose">
      <article className="sl-article">
        <header className="sl-article-header">
          {/* Tag kicker above the title */}
          {primaryTag ? (
            <p className="sl-kicker">
              <Link href={`/tag/${primaryTag.slug}`}>{primaryTag.name}</Link>
            </p>
          ) : null}

          <h1 className="sl-article-title">{post.title}</h1>

          {post.excerpt ? (
            <p className="sl-article-excerpt">{post.excerpt}</p>
          ) : null}

          {/* Byline: avatar + author + date */}
          <div className="sl-byline">
            {post.author.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt={post.author.name}
                className="sl-avatar"
              />
            ) : (
              <span className="sl-avatar-initials" aria-hidden>
                {initials(post.author.name)}
              </span>
            )}
            <span>{post.author.name}</span>
            <span aria-hidden>·</span>
            <time dateTime={isoDate(post.publishedAt)}>
              {longDate(post.publishedAt)}
            </time>
          </div>
        </header>

        {/* Cover image — rendered full-width above the body */}
        {post.coverUrl ? (
          <img src={post.coverUrl} alt="" className="sl-cover" />
        ) : null}

        {/* Post body HTML from the editor */}
        <div
          className="sl-body"
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />

        {/* Tags footer */}
        {post.tags.length > 0 ? (
          <footer className="sl-post-footer">
            <span className="sl-post-footer-label">Filed under</span>
            <div className="sl-tags">
              {post.tags.map((t) => (
                <Link key={t.slug} href={`/tag/${t.slug}`} className="sl-tag">
                  {t.name}
                </Link>
              ))}
            </div>
          </footer>
        ) : null}

        <ShareBar
          url={canonicalUrl}
          title={post.title}
          className="sl-share-bar"
          linkClassName="sl-share-link"
          copyClassName="sl-share-link"
        />
      </article>

      {pageType !== "page" ? (
        <CommentsSection
          comments={comments}
          postUrl={commentPostUrl}
          className="sl-comments"
          headingClassName="sl-comments-heading"
        />
      ) : null}
      {relatedPosts.length > 0 ? (
        <section className="sl-related">
          <h2 className="sl-related-heading">You might also like</h2>
          <ul className="sl-post-list sl-related-list">
            {relatedPosts.map((p) => (
              <PostListItem key={p.id} post={p} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
