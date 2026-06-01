import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { getRobotsTxt } from "@/lib/db";
import SeoSettingsForm from "./SeoSettingsForm";

export const runtime = "edge";

export default async function SeoSettingsPage() {
  await requireUser();
  const env = getEnv();
  const robots = await getRobotsTxt(env.DB);
  return <SeoSettingsForm initialRobots={robots} />;
}
