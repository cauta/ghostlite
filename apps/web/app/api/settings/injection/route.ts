import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { getInjectionSettings, setInjectionSettings } from "@/lib/db";

export const runtime = "edge";

export async function GET() {
  await requireAdmin();
  const env = getEnv();
  const settings = await getInjectionSettings(env.DB);
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  await requireAdmin();
  const env = getEnv();

  let body: { headCss?: string; headJs?: string; footerJs?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await setInjectionSettings(env.DB, {
    headCss: (body.headCss ?? "").trim(),
    headJs: (body.headJs ?? "").trim(),
    footerJs: (body.footerJs ?? "").trim(),
  });

  return NextResponse.json({ ok: true });
}
