import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { createPost } from "@/lib/db";
import { ulid } from "@/lib/ulid";
import { postBodyKey, writePostBody } from "@/lib/storage";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const title = (body.title ?? "").trim() || "Untitled";
  const env = getEnv();
  const id = ulid().toLowerCase();
  const slug = `untitled-${id.slice(-6)}`;
  const bodyKey = postBodyKey(id);

  await writePostBody(env.R2, bodyKey, "<p></p>");
  await createPost(env.DB, {
    id,
    slug,
    title,
    excerpt: "",
    bodyKey,
    authorId: user.id,
  });

  return NextResponse.json({ id });
}
