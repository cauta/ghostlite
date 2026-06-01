import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { deletePost, getPostById, setPostTags, updatePost } from "@/lib/db";
import { deleteObject, writePostBody } from "@/lib/storage";

export const runtime = "edge";

const RESERVED_SLUGS = new Set(["admin", "api", "tag", "_next", "favicon.ico"]);

type PatchBody = {
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  coverKey?: string | null;
  scheduledAt?: number | null;
  status?: "draft" | "scheduled";
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const env = getEnv();
  const post = await getPostById(env.DB, params.id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role === "author" && post.author_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.slug === "string" && RESERVED_SLUGS.has(body.slug)) {
    return NextResponse.json(
      { error: `Slug "${body.slug}" is reserved. Pick another.` },
      { status: 400 },
    );
  }

  // Status transitions allowed via PATCH: draft <-> scheduled.
  // Going to/from published goes through the publish/unpublish endpoints.
  if (body.status && body.status !== post.status) {
    if (post.status === "published") {
      return NextResponse.json(
        { error: "Use /unpublish to change a published post's status" },
        { status: 400 },
      );
    }
    if (body.status === "scheduled" && !body.scheduledAt) {
      return NextResponse.json(
        { error: "scheduledAt is required to schedule a post" },
        { status: 400 },
      );
    }
  }

  if (typeof body.body === "string") {
    await writePostBody(env.R2, post.body_key, body.body);
  }

  await updatePost(env.DB, params.id, {
    title: body.title,
    slug: body.slug,
    excerpt: body.excerpt,
    coverKey: body.coverKey,
    status: body.status,
    scheduledAt: body.scheduledAt,
    seoTitle: body.seoTitle,
    seoDescription: body.seoDescription,
  });

  if (Array.isArray(body.tags)) {
    await setPostTags(env.DB, params.id, body.tags);
  }

  if (post.status === "published") {
    await invalidatePostCache(env.KV, params.id);
    // Also bust the sitemap cache (slug may have changed)
    env.KV.delete("sitemap-xml").catch(() => {});
    // Also bust the RSS feed cache so edits are reflected
    env.KV.delete("rss:feed").catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const env = getEnv();
  const post = await getPostById(env.DB, params.id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role === "author" && post.author_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteObject(env.R2, post.body_key).catch(() => {});
  await deletePost(env.DB, params.id);
  await invalidatePostCache(env.KV, params.id);

  return NextResponse.json({ ok: true });
}

async function invalidatePostCache(
  kv: import("@cloudflare/workers-types").KVNamespace,
  postId: string,
) {
  const list = await kv.list({ prefix: `post-html:${postId}:` });
  await Promise.all(list.keys.map((k) => kv.delete(k.name))).catch(() => {});
}
