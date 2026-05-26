import type { Metadata } from "next";
import "../themes/default/styles.css";
import "../themes/editorial/styles.css";
import "./admin/admin.css";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Ghostlite",
  description: "A blog",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
