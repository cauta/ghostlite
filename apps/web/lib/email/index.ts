import type { CloudflareEnv } from "../env";
import { decryptSecret, encryptSecret } from "../crypto";
import { getSetting, setSetting } from "../db";
import { EmailProvider, EmailSendError, EmailSettings, EmailSettingsStored, SendArgs } from "./types";
import { ResendProvider } from "./providers/resend";
import { MailgunProvider } from "./providers/mailgun";
import { SendGridProvider } from "./providers/sendgrid";

const SETTINGS_KEY = "email";

export async function loadEmailSettings(env: CloudflareEnv): Promise<EmailSettings> {
  const stored = await getSetting<EmailSettingsStored>(env.DB, SETTINGS_KEY);
  if (!stored || stored.provider === "none") return { provider: "none" };

  const apiKey = await decryptSecret(stored.apiKeyEncrypted, env.EMAIL_KEK);
  switch (stored.provider) {
    case "resend":
      return { provider: "resend", apiKey, fromAddress: stored.fromAddress, fromName: stored.fromName };
    case "mailgun":
      return {
        provider: "mailgun",
        apiKey,
        domain: stored.domain,
        region: stored.region,
        fromAddress: stored.fromAddress,
        fromName: stored.fromName,
      };
    case "sendgrid":
      return { provider: "sendgrid", apiKey, fromAddress: stored.fromAddress, fromName: stored.fromName };
  }
}

export async function saveEmailSettings(
  env: CloudflareEnv,
  settings: EmailSettings,
): Promise<void> {
  if (settings.provider === "none") {
    await setSetting(env.DB, SETTINGS_KEY, { provider: "none" });
    return;
  }
  const apiKeyEncrypted = await encryptSecret(settings.apiKey, env.EMAIL_KEK);
  const stored: EmailSettingsStored =
    settings.provider === "resend"
      ? {
          provider: "resend",
          apiKeyEncrypted,
          fromAddress: settings.fromAddress,
          fromName: settings.fromName,
        }
      : settings.provider === "mailgun"
        ? {
            provider: "mailgun",
            apiKeyEncrypted,
            domain: settings.domain,
            region: settings.region,
            fromAddress: settings.fromAddress,
            fromName: settings.fromName,
          }
        : {
            provider: "sendgrid",
            apiKeyEncrypted,
            fromAddress: settings.fromAddress,
            fromName: settings.fromName,
          };
  await setSetting(env.DB, SETTINGS_KEY, stored);
}

export async function getEmailProvider(env: CloudflareEnv): Promise<{
  provider: EmailProvider;
  fromAddress: string;
  fromName?: string;
} | null> {
  const cfg = await loadEmailSettings(env);
  if (cfg.provider === "none") return null;
  switch (cfg.provider) {
    case "resend":
      return {
        provider: new ResendProvider(cfg.apiKey),
        fromAddress: cfg.fromAddress,
        fromName: cfg.fromName,
      };
    case "mailgun":
      return {
        provider: new MailgunProvider(cfg.apiKey, cfg.domain, cfg.region ?? "us"),
        fromAddress: cfg.fromAddress,
        fromName: cfg.fromName,
      };
    case "sendgrid":
      return {
        provider: new SendGridProvider(cfg.apiKey),
        fromAddress: cfg.fromAddress,
        fromName: cfg.fromName,
      };
  }
}

/** High-level sendEmail. The caller doesn't need to know which provider runs. */
export async function sendEmail(
  env: CloudflareEnv,
  args: Omit<SendArgs, "from"> & { from?: string },
): Promise<{ id: string }> {
  const cfg = await getEmailProvider(env);
  if (!cfg) {
    console.warn("[email] no provider configured; skipping send to", args.to);
    return { id: "noop" };
  }
  const from = args.from ??
    (cfg.fromName ? `${cfg.fromName} <${cfg.fromAddress}>` : cfg.fromAddress);
  return cfg.provider.send({ ...args, from });
}

export { EmailSendError };
export type { EmailProvider, EmailSettings, SendArgs };
