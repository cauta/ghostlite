import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { getTopPosts, getTotalViews30d } from "@/lib/analytics";

export const runtime = "edge";

export default async function AnalyticsPage() {
  await requireAdmin();
  const env = getEnv();

  const [topPosts, totalViews] = await Promise.all([
    getTopPosts(env.KV, 10),
    getTotalViews30d(env.KV),
  ]);

  const maxViews = topPosts[0]?.views30d ?? 1;

  return (
    <div>
      <div className="admin-page-header">
        <h1>Analytics</h1>
        <span style={{ color: "#6b6b6b", fontSize: 13 }}>Last 30 days · GDPR-free, no cookies</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 32 }}>
        <div className="stat-card">
          <div style={{ fontSize: 13, color: "#6b6b6b", marginBottom: 4 }}>Total views (30d)</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{totalViews.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 13, color: "#6b6b6b", marginBottom: 4 }}>Posts tracked</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{topPosts.length}</div>
        </div>
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Top posts</h2>

      {topPosts.length === 0 ? (
        <div className="admin-empty">
          <p>No page views recorded yet. Views are counted when readers visit published posts.</p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "40%" }}>Post</th>
              <th>Views (30d)</th>
              <th style={{ width: "30%" }}>Bar</th>
              <th>All-time</th>
            </tr>
          </thead>
          <tbody>
            {topPosts.map((p) => (
              <tr key={p.slug}>
                <td>
                  <a href={`/${p.slug}/`} target="_blank" rel="noreferrer"
                    style={{ color: "inherit" }}>
                    {p.slug}
                  </a>
                </td>
                <td style={{ fontWeight: 600 }}>{p.views30d.toLocaleString()}</td>
                <td>
                  <div style={{
                    height: 8,
                    borderRadius: 4,
                    background: "#e5e7eb",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.round((p.views30d / maxViews) * 100)}%`,
                      background: "#6366f1",
                      borderRadius: 4,
                    }} />
                  </div>
                </td>
                <td style={{ color: "#6b6b6b" }}>{p.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: 24, fontSize: 12, color: "#9ca3af" }}>
        Views are counted server-side on every public post page load.
        Admin users are excluded. Counters may be off by ±1 under concurrent load.
      </p>
    </div>
  );
}
