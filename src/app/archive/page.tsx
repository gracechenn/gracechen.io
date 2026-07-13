import type { Metadata } from "next";
import Link from "next/link";
import { getArchivePages, type PageInfo } from "@/lib/content";

export const metadata: Metadata = {
  title: "Archive",
  description: "Older versions and unlinked pages from Grace Chen's portfolio, kept for reference.",
  robots: { index: false, follow: false },
};

const GROUPS: { name: string; match: (p: PageInfo) => boolean }[] = [
  { name: "Home", match: (p) => p.key.startsWith("home") },
  { name: "About", match: (p) => p.key.startsWith("about") },
  { name: "Playground", match: (p) => p.key.startsWith("play") },
  { name: "Roblox", match: (p) => p.key.startsWith("roblox") },
  {
    name: "Case studies & projects",
    match: (p) =>
      /^(better-world|bwxd|brown|hab|hackatbrown|read|readly|art-prints|deck)/.test(p.key),
  },
  { name: "Other", match: () => true },
];

function group(pages: PageInfo[]) {
  const remaining = [...pages];
  return GROUPS.map(({ name, match }) => {
    const items: PageInfo[] = [];
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (match(remaining[i])) items.unshift(...remaining.splice(i, 1));
    }
    return { name, items: items.sort((a, b) => a.key.localeCompare(b.key)) };
  }).filter((g) => g.items.length);
}

export default function ArchiveIndex() {
  const grouped = group(getArchivePages());
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "80px 24px 120px",
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        color: "#111",
      }}
    >
      <p style={{ marginBottom: 8 }}>
        <Link href="/" style={{ color: "#888", textDecoration: "none" }}>
          ← Back to gracechen.io
        </Link>
      </p>
      <h1 style={{ fontSize: 40, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Archive</h1>
      <p style={{ color: "#666", margin: "0 0 48px", lineHeight: 1.6 }}>
        Older versions and unlinked pages from previous iterations of this portfolio. These are kept
        for reference and are intentionally hidden from search engines and the main navigation.
      </p>
      {grouped.map((g) => (
        <section key={g.name} style={{ marginBottom: 40 }}>
          <h2
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#999",
              margin: "0 0 12px",
            }}
          >
            {g.name}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {g.items.map((p) => (
              <li key={p.key} style={{ padding: "10px 0", borderTop: "1px solid #eee" }}>
                <Link
                  href={p.route}
                  style={{
                    color: "#111",
                    textDecoration: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <span>{p.title || p.key}</span>
                  <span style={{ color: "#bbb", fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
                    /{p.key}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
