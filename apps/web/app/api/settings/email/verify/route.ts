import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { getEmailProvider } from "@/lib/email";

export const runtime = "edge";

export async function POST() {
  await requireAdmin();
  const env = getEnv();
  const cfg = await getEmailProvider(env);
  if (!cfg) return NextResponse.json({ ok: false, error: "No provider configured" });

  try {
    const result = await cfg.provider.verifyConfig();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message });
  }
}
