import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { getPostById, updatePost } from "@/lib/db";

export const runtime = "edge";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const env = getEnv();
  const post = await getPostById(env.DB, params.id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role === "author" && post.author_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await updatePost(env.DB, params.id, {
    status: "published",
    publishedAt: Math.floor(Date.now() / 1000),
    scheduledAt: null,
  });

  // Bust the sitemap KV cache so the new post appears immediately
  env.KV.delete("sitemap-xml").catch(() => {});
  // Bust RSS feed cache so the new post appears immediately
  env.KV.delete("rss:feed").catch(() => {});

  return NextResponse.json({ ok: true });
}
