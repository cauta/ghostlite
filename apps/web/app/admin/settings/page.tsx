import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const runtime = "edge";

export default async function SettingsHome() {
  await requireUser();
  return (
    <div>
      <div className="admin-page-header">
        <h1>Settings</h1>
      </div>
      <div style={{ display: "grid", gap: 12, maxWidth: 600 }}>
        <SectionCard
          href="/admin/settings/site"
          title="Site"
          desc="Title, description, and logo shown on the public blog."
        />
        <SectionCard
          href="/admin/settings/theme"
          title="Theme"
          desc="Choose the reading theme for your public blog."
        />
        <SectionCard
          href="/admin/settings/email"
          title="Email"
          desc="Configure your email provider for invites, notifications, and password resets."
        />
        <SectionCard
          href="/admin/settings/seo"
          title="SEO"
          desc="Customize robots.txt crawl rules served to search engine bots."
        />
        <SectionCard
          href="/admin/settings/injection"
          title="Code injection"
          desc="Inject custom CSS, head scripts, or footer scripts into every public page."
        />
      </div>
    </div>
  );
}

function SectionCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: 20,
        background: "#fff",
        border: "1px solid #e5e5e5",
        borderRadius: 6,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ fontWeight: 500, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#6b6b6b" }}>{desc}</div>
    </Link>
  );
}
