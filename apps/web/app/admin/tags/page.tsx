import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { listTagsWithPostCount } from "@/lib/db";
import TagsManager from "./TagsManager";

export const runtime = "edge";

export default async function TagsPage() {
  await requireUser();
  const env = getEnv();
  const tags = await listTagsWithPostCount(env.DB);
  return <TagsManager tags={tags} />;
}
