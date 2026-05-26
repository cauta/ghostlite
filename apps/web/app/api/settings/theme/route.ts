import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { getThemeSettings, setSetting } from "@/lib/db";
import { listAvailableThemes } from "@/themes/loader";

export const runtime = "edge";

// Switch the active public reading theme. The chosen theme id must be one of
// the registered built-in themes; any per-theme config is left untouched.
export async function PUT(req: NextRequest) {
  await requireAdmin();
  const env = getEnv();

  let body: { theme?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const theme = (body.theme ?? "").trim();
  if (!listAvailableThemes().includes(theme)) {
    return NextResponse.json({ error: "Unknown theme" }, { status: 400 });
  }

  const current = await getThemeSettings(env.DB);
  await setSetting(env.DB, "theme", { active: theme, config: current.config });
  return NextResponse.json({ ok: true });
}
