import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { setSetting } from "@/lib/db";

export const runtime = "edge";

export async function PUT(req: NextRequest) {
  await requireAdmin();
  const env = getEnv();

  let body: { title?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const description = (body.description ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  await setSetting(env.DB, "site", { title, description, logo_key: null });
  return NextResponse.json({ ok: true });
}
