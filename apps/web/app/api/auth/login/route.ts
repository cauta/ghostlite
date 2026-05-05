import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { verifyPassword } from "@/lib/password";
import { buildSessionCookie, createSession } from "@/lib/session";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const env = getEnv();
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await env.DB
    .prepare("SELECT id, password_hash FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: string; password_hash: string }>();

  // Same response on missing user vs bad password to avoid user enumeration
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await createSession(env.DB, user.id);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildSessionCookie(session.id, session.expiresAt));
  return res;
}
