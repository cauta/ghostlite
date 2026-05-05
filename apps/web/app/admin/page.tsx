import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { listAllPosts } from "@/lib/db";

export const runtime = "edge";

export default async function AdminHome() {
  await requireUser();
  const env = getEnv();
  const posts = await listAllPosts(env.DB);

  const counts = {
    draft: posts.filter((p) => p.status === "draft").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter((p) => p.status === "published").length,
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1>Dashboard</h1>
        <Link href="/admin/posts/new" className="admin-btn primary">New post</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        <Stat label="Drafts"     value={counts.draft} />
        <Stat label="Scheduled"  value={counts.scheduled} />
        <Stat label="Published"  value={counts.published} />
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Recent posts</h2>
      {posts.length === 0 ? (
        <div className="admin-empty">
          <p>No posts yet.</p>
          <Link href="/admin/posts/new" className="admin-btn primary">Write your first post</Link>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Title</th><th>Status</th><th>Author</th><th>Updated</th></tr>
          </thead>
          <tbody>
            {posts.slice(0, 10).map((p) => (
              <tr key={p.id}>
                <td><Link href={`/admin/posts/${p.id}`}>{p.title}</Link></td>
                <td><span className={`admin-pill ${p.status}`}>{p.status}</span></td>
                <td>{p.author_name}</td>
                <td>{new Date(p.updated_at * 1000).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 6, padding: 20 }}>
      <div style={{ fontSize: 13, color: "#6b6b6b", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
