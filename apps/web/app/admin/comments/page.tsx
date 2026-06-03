import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { listAllComments } from "@/lib/db";
import { CommentActions } from "./CommentActions";

export const runtime = "edge";

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireAdmin();
  const env = getEnv();

  const statusFilter =
    searchParams.status === "approved"
      ? "approved"
      : searchParams.status === "spam"
        ? "spam"
        : searchParams.status === "pending"
          ? "pending"
          : undefined;

  const comments = await listAllComments(env.DB, { status: statusFilter });

  const tabs = [
    { label: "All", value: undefined },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Spam", value: "spam" },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <h1>Comments</h1>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {tabs.map((tab) => {
          const href = tab.value ? `/admin/comments?status=${tab.value}` : "/admin/comments";
          const active = statusFilter === tab.value;
          return (
            <a
              key={tab.label}
              href={href}
              style={{
                padding: "4px 12px",
                borderRadius: 4,
                background: active ? "#6366f1" : "#f3f4f6",
                color: active ? "#fff" : "inherit",
                textDecoration: "none",
                fontSize: 13,
              }}
            >
              {tab.label}
            </a>
          );
        })}
      </div>

      {comments.length === 0 ? (
        <div className="admin-empty">
          <p>No comments found.</p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Author</th>
              <th>Post</th>
              <th>Comment</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {comments.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{c.author_name}</div>
                  <div style={{ fontSize: 12, color: "#6b6b6b" }}>{c.author_email}</div>
                </td>
                <td>
                  <a href={`/${c.post_slug}/`} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                    {c.post_title}
                  </a>
                </td>
                <td style={{ maxWidth: 300 }}>
                  <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {c.body}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: "#6b6b6b", whiteSpace: "nowrap" }}>
                  {fmtDate(c.created_at)}
                </td>
                <td>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      background:
                        c.status === "approved"
                          ? "#dcfce7"
                          : c.status === "spam"
                            ? "#fee2e2"
                            : "#fef9c3",
                      color:
                        c.status === "approved"
                          ? "#166534"
                          : c.status === "spam"
                            ? "#991b1b"
                            : "#713f12",
                    }}
                  >
                    {c.status}
                  </span>
                </td>
                <td>
                  <CommentActions id={c.id} status={c.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
