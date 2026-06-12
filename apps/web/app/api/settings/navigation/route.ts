import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { getNavigation, setNavigation } from "@/lib/db";
import type { NavItem } from "@/lib/db";

export const runtime = "edge";

export async function GET() {
  await requireAdmin();
  const env = getEnv();
  const navigation = await getNavigation(env.DB);
  return NextResponse.json(navigation);
}

function isNavItem(v: unknown): v is NavItem {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as NavItem).label === "string" &&
    typeof (v as NavItem).url === "string"
  );
}

export async function PATCH(req: NextRequest) {
  await requireAdmin();
  const env = getEnv();

  let body: { primary?: unknown[]; secondary?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = await getNavigation(env.DB);
  const primary = Array.isArray(body.primary)
    ? (body.primary.filter(isNavItem) as NavItem[])
    : current.primary;
  const secondary = Array.isArray(body.secondary)
    ? (body.secondary.filter(isNavItem) as NavItem[])
    : current.secondary;

  await setNavigation(env.DB, { primary, secondary });
  return NextResponse.json({ ok: true });
}
