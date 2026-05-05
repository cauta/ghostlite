import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { loadEmailSettings } from "@/lib/email";
import EmailSettingsForm from "./EmailSettingsForm";

export const runtime = "edge";

export default async function EmailSettingsPage() {
  await requireAdmin();
  const env = getEnv();
  const settings = await loadEmailSettings(env);

  // Don't leak the API key to the client - just signal whether one is set
  const initial =
    settings.provider === "none"
      ? { provider: "none" as const }
      : settings.provider === "mailgun"
        ? {
            provider: "mailgun" as const,
            hasKey: true,
            domain: settings.domain,
            region: settings.region ?? "us",
            fromAddress: settings.fromAddress,
            fromName: settings.fromName ?? "",
          }
        : {
            provider: settings.provider,
            hasKey: true,
            fromAddress: settings.fromAddress,
            fromName: settings.fromName ?? "",
          };

  return <EmailSettingsForm initial={initial} />;
}
