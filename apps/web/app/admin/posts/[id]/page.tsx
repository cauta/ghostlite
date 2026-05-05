import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { getPostById } from "@/lib/db";
import { readPostBody } from "@/lib/storage";
import PostEditor from "./PostEditor";

export const runtime = "edge";

export default async function EditPost({ params }: { params: { id: string } }) {
  await requireUser();
  const env = getEnv();
  const post = await getPostById(env.DB, params.id);
  if (!post) notFound();

  const body = await readPostBody(env.R2, post.body_key);

  return (
    <PostEditor
      post={{
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? "",
        body,
        status: post.status,
        scheduledAt: post.scheduled_at,
      }}
    />
  );
}
