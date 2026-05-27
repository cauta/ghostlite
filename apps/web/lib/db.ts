// Thin typed query layer over D1.
//
// We don't use Drizzle here to keep the install footprint small. Each query
// is a function. As the surface grows past ~30 queries, switching to Drizzle
// is a one-PR change because all SQL lives here.

import type { D1Database } from "@cloudflare/workers-types";
import type { PostFull, PostSummary, Tag } from "@/themes/theme.types";

// ----- Settings -----

export async function getSetting<T = unknown>(db: D1Database, key: string): Promise<T | null> {
  const row = await db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .bind(key)
    .first<{ value: string }>();
  return row ? (JSON.parse(row.value) as T) : null;
}

export async function setSetting(db: D1Database, key: string, value: unknown): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(key, JSON.stringify(value), now)
    .run();
}

export async function getSiteSettings(db: D1Database) {
  return (
    (await getSetting<{ title: string; description: string; logo_key: string | null }>(db, "site")) ?? {
      title: "Ghostlite",
      description: "",
      logo_key: null,
    }
  );
}

export type ThemeSettings = { active: string; config: Record<string, unknown> };

export async function getThemeSettings(db: D1Database): Promise<ThemeSettings> {
  const t = await getSetting<ThemeSettings>(db, "theme");
  return { active: t?.active ?? "default", config: t?.config ?? {} };
}

export async function getActiveThemeName(db: D1Database): Promise<string> {
  return (await getThemeSettings(db)).active;
}

// ----- Posts (public) -----

type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_key: string | null;
  body_key: string;
  published_at: number;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
};

const PUBLIC_POST_COLUMNS = `
  p.id, p.slug, p.title, p.excerpt, p.cover_key, p.body_key, p.published_at,
  u.id   as author_id,
  u.name as author_name,
  u.avatar_key as author_avatar
`;

function rowToSummary(r: PostRow): PostSummary {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    coverUrl: r.cover_key ? `/api/media/${r.cover_key}` : null,
    publishedAt: r.published_at,
    author: {
      name: r.author_name,
      avatarUrl: r.author_avatar ? `/api/media/${r.author_avatar}` : null,
    },
  };
}

export async function listPublishedPosts(
  db: D1Database,
  opts: { page?: number; perPage?: number } = {},
): Promise<{ posts: PostSummary[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.max(1, Math.min(50, opts.perPage ?? 10));
  const offset = (page - 1) * perPage;

  const [postsRes, countRes] = await db.batch([
    db
      .prepare(
        `SELECT ${PUBLIC_POST_COLUMNS}
         FROM posts p JOIN users u ON u.id = p.author_id
         WHERE p.status = 'published' AND p.published_at <= unixepoch()
         ORDER BY p.published_at DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(perPage, offset),
    db.prepare(
      `SELECT COUNT(*) as c FROM posts WHERE status = 'published' AND published_at <= unixepoch()`,
    ),
  ]);

  const rows = (postsRes.results as unknown as PostRow[]) ?? [];
  const total = ((countRes.results as unknown as { c: number }[])[0]?.c) ?? 0;
  return {
    posts: rows.map(rowToSummary),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getPublishedPostBySlug(
  db: D1Database,
  slug: string,
): Promise<{ row: PostRow; tags: Tag[] } | null> {
  const row = await db
    .prepare(
      `SELECT ${PUBLIC_POST_COLUMNS}
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.slug = ? AND p.status = 'published' AND p.published_at <= unixepoch()`,
    )
    .bind(slug)
    .first<PostRow>();
  if (!row) return null;

  const tagsRes = await db
    .prepare(
      `SELECT t.slug, t.name FROM tags t
       JOIN post_tags pt ON pt.tag_id = t.id
       WHERE pt.post_id = ?
       ORDER BY t.name`,
    )
    .bind(row.id)
    .all<Tag>();
  const tags = (tagsRes.results as Tag[]) ?? [];
  return { row, tags };
}

export function rowToPostFull(r: PostRow, bodyHtml: string, tags: Tag[]): PostFull {
  return { ...rowToSummary(r), bodyHtml, tags };
}

export async function listPostsByTag(
  db: D1Database,
  tagSlug: string,
): Promise<{ tag: Tag; posts: PostSummary[] } | null> {
  const tag = await db
    .prepare("SELECT slug, name FROM tags WHERE slug = ?")
    .bind(tagSlug)
    .first<Tag>();
  if (!tag) return null;

  const res = await db
    .prepare(
      `SELECT ${PUBLIC_POST_COLUMNS}
       FROM posts p
       JOIN users u ON u.id = p.author_id
       JOIN post_tags pt ON pt.post_id = p.id
       JOIN tags t ON t.id = pt.tag_id
       WHERE t.slug = ? AND p.status = 'published' AND p.published_at <= unixepoch()
       ORDER BY p.published_at DESC
       LIMIT 50`,
    )
    .bind(tagSlug)
    .all<PostRow>();
  return { tag, posts: ((res.results as PostRow[]) ?? []).map(rowToSummary) };
}

// ----- RSS feed -----

export type RssPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_key: string | null;
  body_key: string;
  published_at: number;
  author_name: string;
};

export async function getRecentPublishedPosts(
  db: D1Database,
  limit = 15,
): Promise<RssPostRow[]> {
  const res = await db
    .prepare(
      `SELECT p.id, p.slug, p.title, p.excerpt, p.cover_key, p.body_key, p.published_at,
              u.name as author_name
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.status = 'published' AND p.published_at <= unixepoch()
       ORDER BY p.published_at DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all<RssPostRow>();
  return (res.results as RssPostRow[]) ?? [];
}

// ----- Posts (admin) -----

export type AdminPostRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "scheduled" | "published";
  author_id: string;
  author_name: string;
  updated_at: number;
  published_at: number | null;
};

export async function listAllPosts(db: D1Database): Promise<AdminPostRow[]> {
  const res = await db
    .prepare(
      `SELECT p.id, p.slug, p.title, p.status, p.author_id, u.name as author_name,
              p.updated_at, p.published_at
       FROM posts p JOIN users u ON u.id = p.author_id
       ORDER BY p.updated_at DESC LIMIT 100`,
    )
    .all<AdminPostRow>();
  return (res.results as AdminPostRow[]) ?? [];
}

export type DraftPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string; // raw markdown/html (sourced from R2)
  status: "draft" | "scheduled" | "published";
  authorId: string;
  scheduledAt: number | null;
};

export async function getPostById(
  db: D1Database,
  id: string,
): Promise<{
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_key: string | null;
  body_key: string;
  status: "draft" | "scheduled" | "published";
  author_id: string;
  scheduled_at: number | null;
  published_at: number | null;
} | null> {
  return await db
    .prepare(
      `SELECT id, slug, title, excerpt, cover_key, body_key, status, author_id, scheduled_at, published_at
       FROM posts WHERE id = ?`,
    )
    .bind(id)
    .first();
}

// ----- Tags (admin) -----

export async function listAllTags(db: D1Database): Promise<Tag[]> {
  const res = await db
    .prepare("SELECT slug, name FROM tags ORDER BY name")
    .all<Tag>();
  return (res.results as Tag[]) ?? [];
}

export type TagWithCount = { id: string; slug: string; name: string; postCount: number };

/** List every tag with the number of posts that reference it. */
export async function listTagsWithPostCount(db: D1Database): Promise<TagWithCount[]> {
  const res = await db
    .prepare(
      `SELECT t.id, t.slug, t.name, COUNT(pt.post_id) as postCount
       FROM tags t LEFT JOIN post_tags pt ON pt.tag_id = t.id
       GROUP BY t.id ORDER BY t.name`,
    )
    .all<TagWithCount>();
  return (res.results as TagWithCount[]) ?? [];
}

/** Rename a tag — updates both the display name and the URL slug. */
export async function updateTag(
  db: D1Database,
  id: string,
  data: { name: string; slug: string },
): Promise<void> {
  await db
    .prepare("UPDATE tags SET name = ?, slug = ? WHERE id = ?")
    .bind(data.name, data.slug, id)
    .run();
}

/** Delete a tag by ID. post_tags rows are removed via ON DELETE CASCADE. */
export async function deleteTag(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM tags WHERE id = ?").bind(id).run();
}

export async function getPostTags(db: D1Database, postId: string): Promise<Tag[]> {
  const res = await db
    .prepare(
      `SELECT t.slug, t.name FROM tags t
       JOIN post_tags pt ON pt.tag_id = t.id
       WHERE pt.post_id = ? ORDER BY t.name`,
    )
    .bind(postId)
    .all<Tag>();
  return (res.results as Tag[]) ?? [];
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Replaces the tag set for a post. Creates missing tags on the fly.
// `names` is the user-typed list of tag display names.
export async function setPostTags(
  db: D1Database,
  postId: string,
  names: string[],
): Promise<void> {
  const cleaned = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  const tagIds: string[] = [];

  for (const name of cleaned) {
    const slug = slugify(name);
    if (!slug) continue;
    const existing = await db
      .prepare("SELECT id FROM tags WHERE slug = ?")
      .bind(slug)
      .first<{ id: string }>();
    if (existing) {
      tagIds.push(existing.id);
    } else {
      const id = crypto.randomUUID().replace(/-/g, "");
      await db
        .prepare("INSERT INTO tags (id, slug, name) VALUES (?, ?, ?)")
        .bind(id, slug, name)
        .run();
      tagIds.push(id);
    }
  }

  await db.prepare("DELETE FROM post_tags WHERE post_id = ?").bind(postId).run();
  for (const tagId of tagIds) {
    await db
      .prepare("INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)")
      .bind(postId, tagId)
      .run();
  }
}

export async function createPost(
  db: D1Database,
  args: { id: string; slug: string; title: string; excerpt: string; bodyKey: string; authorId: string },
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO posts (id, slug, title, excerpt, body_key, status, author_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
    )
    .bind(args.id, args.slug, args.title, args.excerpt, args.bodyKey, args.authorId, now, now)
    .run();
}

export async function updatePost(
  db: D1Database,
  id: string,
  patch: Partial<{
    slug: string;
    title: string;
    excerpt: string;
    coverKey: string | null;
    status: "draft" | "scheduled" | "published";
    publishedAt: number | null;
    scheduledAt: number | null;
  }>,
): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  const map: Record<keyof typeof patch, string> = {
    slug: "slug",
    title: "title",
    excerpt: "excerpt",
    coverKey: "cover_key",
    status: "status",
    publishedAt: "published_at",
    scheduledAt: "scheduled_at",
  };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    sets.push(`${map[k as keyof typeof patch]} = ?`);
    vals.push(v);
  }
  if (sets.length === 0) return;
  sets.push(`updated_at = ?`);
  vals.push(Math.floor(Date.now() / 1000));
  vals.push(id);
  await db
    .prepare(`UPDATE posts SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...vals)
    .run();
}

export async function deletePost(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
}

// ----- Sitemap helpers -----

export type PostSlugRow = { slug: string; updated_at: number };

/** All published post slugs + their last-modified timestamp for sitemap.xml. */
export async function getAllPublishedPostSlugs(db: D1Database): Promise<PostSlugRow[]> {
  const res = await db
    .prepare(
      `SELECT slug, updated_at FROM posts WHERE status = 'published' AND published_at <= unixepoch()
       ORDER BY published_at DESC`,
    )
    .all<PostSlugRow>();
  return (res.results as PostSlugRow[]) ?? [];
}

/** Slugs of tags that have at least one published post — for sitemap.xml. */
export async function getAllTagsWithPublishedPosts(db: D1Database): Promise<string[]> {
  const res = await db
    .prepare(
      `SELECT DISTINCT t.slug FROM tags t
       INNER JOIN post_tags pt ON pt.tag_id = t.id
       INNER JOIN posts p ON pt.post_id = p.id
       WHERE p.status = 'published' AND p.published_at <= unixepoch()`,
    )
    .all<{ slug: string }>();
  return ((res.results as { slug: string }[]) ?? []).map((r) => r.slug);
}
