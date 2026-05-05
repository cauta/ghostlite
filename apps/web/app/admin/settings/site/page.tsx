import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { getSiteSettings } from "@/lib/db";
import SiteSettingsForm from "./SiteSettingsForm";

export const runtime = "edge";

export default async function SiteSettingsPage() {
  await requireUser();
  const env = getEnv();
  const site = await getSiteSettings(env.DB);
  return <SiteSettingsForm initial={site} />;
}
