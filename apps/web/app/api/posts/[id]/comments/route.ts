import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { createComment, getAdminEmail, getPostById, listApprovedComments } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ulid } from "@/lib/ulid";
import { sendEmail } from "@/lib/email";

export const runtime = "edge";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const env = getEnv();
  const comments = await listApprovedComments(env.DB, params.id);
  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const env = getEnv();

  const post = await getPostById(env.DB, params.id);
  if (!post || post.status !== "published") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { authorName?: unknown; authorEmail?: unknown; body?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const authorName = typeof body.authorName === "string" ? body.authorName.trim() : "";
  const authorEmail = typeof body.authorEmail === "string" ? body.authorEmail.trim() : "";
  const commentBody = typeof body.body === "string" ? body.body.trim() : "";

  if (!authorName || authorName.length > 100) {
    return NextResponse.json({ error: "Name is required (max 100 chars)" }, { status: 400 });
  }
  if (!authorEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!commentBody || commentBody.length > 5000) {
    return NextResponse.json({ error: "Comment body is required (max 5000 chars)" }, { status: 400 });
  }

  // Block admin users from submitting comments as readers
  const user = await getCurrentUser();
  if (user && (user.role === "admin" || user.role === "editor")) {
    return NextResponse.json({ error: "Admins cannot submit comments" }, { status: 403 });
  }

  const id = ulid().toLowerCase();
  await createComment(env.DB, {
    id,
    postId: params.id,
    authorName,
    authorEmail,
    body: commentBody,
  });

  // Fire-and-forget admin notification email
  try {
    const adminEmail = await getAdminEmail(env.DB);
    if (adminEmail) {
      sendEmail(env, {
        to: adminEmail,
        subject: `New comment on "${post.title}"`,
        html: `<p><strong>${authorName}</strong> (${authorEmail}) wrote:</p><blockquote>${commentBody.replace(/\n/g, "<br>")}</blockquote><p><a href="${req.nextUrl.origin}/admin/comments">Approve or reject</a></p>`,
        text: `${authorName} (${authorEmail}) wrote:\n\n${commentBody}\n\nApprove or reject: ${req.nextUrl.origin}/admin/comments`,
      }).catch(() => {});
    }
  } catch {
    // Non-fatal
  }

  return NextResponse.json({ id, status: "pending" }, { status: 201 });
}
