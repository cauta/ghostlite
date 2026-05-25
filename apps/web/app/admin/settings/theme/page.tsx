import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { getThemeSettings } from "@/lib/db";
import { listThemeManifests } from "@/themes/loader";
import ThemeSettingsForm from "./ThemeSettingsForm";

export const runtime = "edge";

export default async function ThemeSettingsPage() {
  await requireUser();
  const env = getEnv();
  const [themes, settings] = await Promise.all([
    listThemeManifests(),
    getThemeSettings(env.DB),
  ]);
  return <ThemeSettingsForm themes={themes} active={settings.active} />;
}
