import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { sendEmail } from "@/lib/email";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  await requireAdmin();
  const env = getEnv();

  let body: { to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const to = (body.to ?? "").trim();
  if (!to) return NextResponse.json({ error: "Recipient required" }, { status: 400 });

  try {
    const result = await sendEmail(env, {
      to,
      subject: "Ghostlite test email",
      html: "<p>This is a test email from your Ghostlite installation.</p><p>If you received this, your provider is configured correctly.</p>",
      text: "This is a test email from your Ghostlite installation.",
    });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
