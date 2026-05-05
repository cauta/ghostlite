// Email provider abstraction.
//
// Adding a new provider:
//   1. Drop a file in providers/<name>.ts implementing EmailProvider
//   2. Register it in factory.ts
//   3. Add UI fields in app/admin/settings/email/page.tsx

export type SendArgs = {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
};

export interface EmailProvider {
  /** Stable provider name, e.g. "resend". Used as discriminator in settings. */
  name: string;
  /** Send a single transactional email. Throws EmailSendError on failure. */
  send(args: SendArgs): Promise<{ id: string }>;
  /** Cheap call that verifies credentials are valid (optional). */
  verifyConfig(): Promise<{ ok: boolean; error?: string }>;
}

export class EmailSendError extends Error {
  constructor(public provider: string, message: string, public status?: number) {
    super(`[${provider}] ${message}`);
    this.name = "EmailSendError";
  }
}

export type EmailSettings =
  | { provider: "none" }
  | { provider: "resend";   apiKey: string; fromAddress: string; fromName?: string }
  | { provider: "mailgun";  apiKey: string; domain: string; region?: "us" | "eu"; fromAddress: string; fromName?: string }
  | { provider: "sendgrid"; apiKey: string; fromAddress: string; fromName?: string };

export type EmailSettingsStored =
  | { provider: "none" }
  | { provider: "resend";   apiKeyEncrypted: string; fromAddress: string; fromName?: string }
  | { provider: "mailgun";  apiKeyEncrypted: string; domain: string; region?: "us" | "eu"; fromAddress: string; fromName?: string }
  | { provider: "sendgrid"; apiKeyEncrypted: string; fromAddress: string; fromName?: string };
