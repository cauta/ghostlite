import { redirect } from "next/navigation";
import { ulid } from "@/lib/ulid";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { createPost } from "@/lib/db";
import { postBodyKey, writePostBody } from "@/lib/storage";

export const runtime = "edge";

export default async function NewPost() {
  const user = await requireUser();
  const env = getEnv();

  const id = ulid().toLowerCase();
  const slug = `untitled-${id.slice(-6)}`;
  const bodyKey = postBodyKey(id);

  await writePostBody(env.R2, bodyKey, "<p></p>");
  await createPost(env.DB, {
    id,
    slug,
    title: "Untitled",
    excerpt: "",
    bodyKey,
    authorId: user.id,
  });

  redirect(`/admin/posts/${id}`);
}
