import { EmailProvider, EmailSendError, SendArgs } from "../types";

export class SendGridProvider implements EmailProvider {
  name = "sendgrid";
  constructor(private apiKey: string) {}

  async send(args: SendArgs) {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: args.to }] }],
        from: { email: args.from },
        reply_to: args.replyTo ? { email: args.replyTo } : undefined,
        subject: args.subject,
        content: [
          ...(args.text ? [{ type: "text/plain", value: args.text }] : []),
          { type: "text/html", value: args.html },
        ],
      }),
    });
    if (!res.ok) {
      throw new EmailSendError("sendgrid", await res.text(), res.status);
    }
    return { id: res.headers.get("x-message-id") ?? "" };
  }

  async verifyConfig() {
    const res = await fetch("https://api.sendgrid.com/v3/scopes", {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return res.ok ? { ok: true } : { ok: false, error: `Auth failed (${res.status})` };
  }
}
