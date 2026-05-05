import { EmailProvider, EmailSendError, SendArgs } from "../types";

export class ResendProvider implements EmailProvider {
  name = "resend";
  constructor(private apiKey: string) {}

  async send(args: SendArgs) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: args.from,
        to: [args.to],
        reply_to: args.replyTo,
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });
    if (!res.ok) {
      throw new EmailSendError("resend", await res.text(), res.status);
    }
    const data = (await res.json()) as { id: string };
    return { id: data.id };
  }

  async verifyConfig() {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return res.ok ? { ok: true } : { ok: false, error: `Auth failed (${res.status})` };
  }
}
