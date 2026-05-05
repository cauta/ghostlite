import { EmailProvider, EmailSendError, SendArgs } from "../types";

export class MailgunProvider implements EmailProvider {
  name = "mailgun";
  constructor(
    private apiKey: string,
    private domain: string,
    private region: "us" | "eu" = "us",
  ) {}

  private get baseUrl() {
    return this.region === "eu"
      ? "https://api.eu.mailgun.net/v3"
      : "https://api.mailgun.net/v3";
  }

  async send(args: SendArgs) {
    const form = new FormData();
    form.append("from", args.from);
    form.append("to", args.to);
    form.append("subject", args.subject);
    form.append("html", args.html);
    if (args.text) form.append("text", args.text);
    if (args.replyTo) form.append("h:Reply-To", args.replyTo);

    const res = await fetch(`${this.baseUrl}/${this.domain}/messages`, {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`api:${this.apiKey}`) },
      body: form,
    });
    if (!res.ok) {
      throw new EmailSendError("mailgun", await res.text(), res.status);
    }
    const data = (await res.json()) as { id: string };
    return { id: data.id };
  }

  async verifyConfig() {
    const res = await fetch(`${this.baseUrl}/${this.domain}`, {
      headers: { Authorization: "Basic " + btoa(`api:${this.apiKey}`) },
    });
    return res.ok ? { ok: true } : { ok: false, error: `Domain check failed (${res.status})` };
  }
}
