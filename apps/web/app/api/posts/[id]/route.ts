import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { deletePost, getPostById, updatePost } from "@/lib/db";
import { deleteObject, postBodyKey, writePostBody } from "@/lib/storage";

export const runtime = "edge";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const env = getEnv();
  const post = await getPostById(env.DB, params.id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authors can only edit their own; admins/editors can edit anything
  if (user.role === "author" && post.author_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    title?: string;
    slug?: string;
    excerpt?: string;
    body?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Reserve top-level paths that would collide with app routes
  const RESERVED = new Set(["admin", "api", "tag", "_next", "favicon.ico"]);
  if (typeof body.slug === "string" && RESERVED.has(body.slug)) {
    return NextResponse.json(
      { error: `Slug "${body.slug}" is reserved. Pick another.` },
      { status: 400 },
    );
  }

  // Persist body to R2 if changed
  if (typeof body.body === "string") {
    await writePostBody(env.R2, post.body_key, body.body);
  }

  // Then update D1 metadata
  await updatePost(env.DB, params.id, {
    title: body.title,
    slug: body.slug,
    excerpt: body.excerpt,
  });

  // Bust KV cache for this post
  if (post.status === "published") {
    await invalidatePostCache(env.KV, params.id);
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

  // R2 first, then D1. If R2 fails we still have a valid (orphaned) row to clean later.
  await deleteObject(env.R2, post.body_key).catch(() => {});
  await deletePost(env.DB, params.id);
  await invalidatePostCache(env.KV, params.id);

  return NextResponse.json({ ok: true });
}

async function invalidatePostCache(
  kv: import("@cloudflare/workers-types").KVNamespace,
  postId: string,
) {
  // Cache keys look like `post-html:<id>:<published_at>`. List + delete.
  const list = await kv.list({ prefix: `post-html:${postId}:` });
  await Promise.all(list.keys.map((k) => kv.delete(k.name))).catch(() => {});
}
