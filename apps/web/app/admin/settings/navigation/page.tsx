import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { getNavigation } from "@/lib/db";
import NavigationSettingsForm from "./NavigationSettingsForm";

export const runtime = "edge";

export default async function NavigationSettingsPage() {
  await requireUser();
  const env = getEnv();
  const navigation = await getNavigation(env.DB);
  return (
    <NavigationSettingsForm
      initialPrimary={navigation.primary}
      initialSecondary={navigation.secondary}
    />
  );
}
