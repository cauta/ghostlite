import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { getInjectionSettings } from "@/lib/db";
import InjectionSettingsForm from "./InjectionSettingsForm";

export const runtime = "edge";

export default async function InjectionSettingsPage() {
  await requireAdmin();
  const env = getEnv();
  const initial = await getInjectionSettings(env.DB);
  return <InjectionSettingsForm initial={initial} />;
}
