import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";

export const runtime = "edge";

type EmbedResult =
  | { type: "iframe"; src: string; provider: string }
  | { type: "link"; href: string; label: string; provider: string };

async function hashUrl(url: string): Promise<string> {
  const data = new TextEncoder().encode(url);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function resolveEmbed(url: string): EmbedResult | null {
  // YouTube: watch?v=ID or youtu.be/ID
  const ytWatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  const ytShort = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  const ytId = (ytWatch ?? ytShort)?.[1];
  if (ytId && /youtube\.com|youtu\.be/.test(url)) {
    return { type: "iframe", src: `https://www.youtube.com/embed/${ytId}`, provider: "youtube" };
  }

  // Vimeo: vimeo.com/NUMBER
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return { type: "iframe", src: `https://player.vimeo.com/video/${vimeoMatch[1]}`, provider: "vimeo" };
  }

  // CodePen: codepen.io/USER/pen/PEN_ID
  const codepenMatch = url.match(/codepen\.io\/([^/]+)\/pen\/([^/?#]+)/);
  if (codepenMatch) {
    return {
      type: "iframe",
      src: `https://codepen.io/${codepenMatch[1]}/embed/${codepenMatch[2]}?default-tab=result`,
      provider: "codepen",
    };
  }

  // Twitter / X status
  if (/(?:twitter\.com|x\.com)\/.+\/status\/\d+/.test(url)) {
    return { type: "link", href: url, label: "View on X (Twitter) →", provider: "twitter" };
  }

  return null;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  // Only allow known safe origins
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Only HTTPS URLs are supported" }, { status: 400 });
  }

  const embed = resolveEmbed(url);
  if (!embed) return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });

  const env = getEnv();
  const cacheKey = `oembed:${await hashUrl(url)}`;

  const cached = await env.KV.get(cacheKey);
  if (cached) return NextResponse.json(JSON.parse(cached) as EmbedResult);

  env.KV.put(cacheKey, JSON.stringify(embed), { expirationTtl: 86400 }).catch(() => {});

  return NextResponse.json(embed);
}
