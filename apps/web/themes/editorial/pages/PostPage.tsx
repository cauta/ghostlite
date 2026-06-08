import Link from "next/link";
import type { PostPageProps } from "../../theme.types";
import { formatDate, isoDate } from "../format";
import { ShareBar } from "../../shared/ShareBar";
import { CommentsSection } from "../../shared/CommentsSection";
import PostCard from "../components/PostCard";

export default function PostPage({ post, canonicalUrl, relatedPosts, comments, commentPostUrl, pageType }: PostPageProps) {
  const primaryTag = post.tags[0] ?? null;

  return (
    <>
      <article className="ed-post">
        <header className="ed-post-header">
          {primaryTag ? (
            <p className="ed-kicker">
              <Link href={`/tag/${primaryTag.slug}`}>{primaryTag.name}</Link>
            </p>
          ) : null}
          <h1 className="ed-post-title">{post.title}</h1>
          {post.excerpt ? <p className="ed-post-standfirst">{post.excerpt}</p> : null}
          <p className="ed-byline ed-byline-lg">
            <span>By {post.author.name}</span>
            <span aria-hidden> · </span>
            <time dateTime={isoDate(post.publishedAt)}>{formatDate(post.publishedAt)}</time>
          </p>
        </header>

        {post.coverUrl ? (
          <img src={post.coverUrl} alt="" className="ed-post-cover" />
        ) : null}

        <div className="ed-post-body" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />

        {post.tags.length > 0 ? (
          <footer className="ed-post-footer">
            <span className="ed-post-footer-label">Filed under</span>
            <div className="ed-tags">
              {post.tags.map((t) => (
                <Link key={t.slug} href={`/tag/${t.slug}`} className="ed-tag">
                  {t.name}
                </Link>
              ))}
            </div>
          </footer>
        ) : null}

        <ShareBar
          url={canonicalUrl}
          title={post.title}
          className="ed-share-bar"
          linkClassName="ed-share-link"
          copyClassName="ed-share-link"
        />
      </article>
      {pageType !== "page" ? (
        <CommentsSection
          comments={comments}
          postUrl={commentPostUrl}
          className="ed-comments"
          headingClassName="ed-comments-heading"
        />
      ) : null}
      {relatedPosts.length > 0 ? (
        <section className="ed-related">
          <h2 className="ed-related-heading">You might also like</h2>
          <div className="ed-grid ed-related-grid">
            {relatedPosts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
