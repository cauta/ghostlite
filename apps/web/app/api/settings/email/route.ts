import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { loadEmailSettings, saveEmailSettings } from "@/lib/email";
import type { EmailSettings } from "@/lib/email/types";

export const runtime = "edge";

export async function PUT(req: NextRequest) {
  await requireAdmin();
  const env = getEnv();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const provider = body.provider;
  if (provider === "none") {
    await saveEmailSettings(env, { provider: "none" });
    return NextResponse.json({ ok: true });
  }
  if (!["resend", "mailgun", "sendgrid"].includes(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  // If apiKey omitted, keep the previously stored key
  let apiKey: string = body.apiKey ?? "";
  if (!apiKey) {
    const existing = await loadEmailSettings(env);
    if (existing.provider === provider) {
      apiKey = (existing as any).apiKey;
    } else {
      return NextResponse.json(
        { error: "API key required when changing or first setting a provider" },
        { status: 400 },
      );
    }
  }

  const fromAddress = (body.fromAddress ?? "").trim();
  const fromName = (body.fromName ?? "").trim() || undefined;
  if (!fromAddress) return NextResponse.json({ error: "From address required" }, { status: 400 });

  let settings: EmailSettings;
  if (provider === "mailgun") {
    const domain = (body.domain ?? "").trim();
    if (!domain) return NextResponse.json({ error: "Domain required" }, { status: 400 });
    settings = {
      provider: "mailgun",
      apiKey,
      domain,
      region: body.region === "eu" ? "eu" : "us",
      fromAddress,
      fromName,
    };
  } else {
    settings = { provider, apiKey, fromAddress, fromName };
  }

  await saveEmailSettings(env, settings);
  return NextResponse.json({ ok: true });
}
