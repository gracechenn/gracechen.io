import type { Metadata } from "next";
import Link from "next/link";
import CustomCursor from "@/components/CustomCursor";

export const metadata: Metadata = {
  title: "Archive",
  description: "Older versions and unlinked pages from Grace Chen's portfolio, kept for reference.",
  robots: { index: false, follow: false },
};

type ArchiveEntry = { slug: string; title: string; year: number | null };

/**
 * A lightweight directory of the archived pages. Each entry links to the raw,
 * verbatim Webflow export served statically from `public/archive/<slug>.html`
 * (see `next.config.ts` rewrite). Slugs follow a `[title]-[year]` convention:
 * same-subject pages share a title and are distinguished by year (and a short
 * qualifier where a subject has several pages in one year). This list is the
 * only coupling between the clean app and the frozen archive.
 */
const ARCHIVE_PAGES: ArchiveEntry[] = [
  // 2023 portfolio era
  { slug: "home-2023", title: "Home", year: 2023 },
  { slug: "about-2023", title: "About", year: 2023 },
  { slug: "play-2023", title: "Play", year: 2023 },
  { slug: "readly-2023", title: "Readly", year: 2023 },
  { slug: "bwxd-2023", title: "Better World x Design", year: 2023 },
  { slug: "brown-opportunities-2023", title: "Brown Opportunities", year: 2023 },
  { slug: "roblox-moments-2024", title: "Roblox — Moments", year: 2024 },
  { slug: "roblox-moments-2023", title: "Roblox — Moments", year: 2023 },
  { slug: "roblox-talent-hub-2023", title: "Roblox — Talent Hub", year: 2023 },
  { slug: "hackatbrown-2023", title: "Hack@Brown", year: 2023 },

  // 2022 portfolio era
  { slug: "home-2022", title: "Home", year: 2022 },
  { slug: "about-2022", title: "About", year: 2022 },
  { slug: "play-2022", title: "Play", year: 2022 },
  { slug: "readly-2022", title: "Readly", year: 2022 },
  { slug: "bwxd-2022", title: "Better World x Design", year: 2022 },
  { slug: "brown-opportunities-2022", title: "Brown Opportunities", year: 2022 },
  { slug: "hackatbrown-2022", title: "Hack@Brown", year: 2022 },
  { slug: "art-prints-2022", title: "Art Prints", year: 2022 },
  { slug: "roblox-talent-hub-2022", title: "Roblox — Talent Hub", year: 2022 },

  // No clear year — utility / unversioned pages
  { slug: "deck", title: "Deck", year: null },
];

type ArchiveGroup = { name: string; items: ArchiveEntry[] };

// Within a year, the site-chrome/index pages come first in navigation order;
// everything else that year is a case study, listed after (alphabetically).
const CHROME_ORDER: Record<string, number> = { Home: 0, About: 1, Play: 2 };

const byChromeThenTitle = (a: ArchiveEntry, b: ArchiveEntry) => {
  const ra = CHROME_ORDER[a.title] ?? Number.MAX_SAFE_INTEGER;
  const rb = CHROME_ORDER[b.title] ?? Number.MAX_SAFE_INTEGER;
  if (ra !== rb) return ra - rb;
  return a.title.localeCompare(b.title) || a.slug.localeCompare(b.slug);
};

/**
 * Group entries into year sections (newest-first), with unversioned pages last.
 * Inside each group the index pages (home/about/play) lead, then case studies.
 */
function groupByYear(pages: ArchiveEntry[]): ArchiveGroup[] {
  const years = Array.from(
    new Set(pages.filter((p) => p.year !== null).map((p) => p.year as number)),
  ).sort((a, b) => b - a);

  const groups: ArchiveGroup[] = years.map((year) => ({
    name: String(year),
    items: pages.filter((p) => p.year === year).sort(byChromeThenTitle),
  }));

  const other = pages.filter((p) => p.year === null).sort(byChromeThenTitle);
  if (other.length) groups.push({ name: "Other", items: other });

  return groups.filter((g) => g.items.length);
}

export default function ArchiveIndex() {
  const grouped = groupByYear(ARCHIVE_PAGES);
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
      <CustomCursor />
      <p style={{ marginBottom: 20 }}>
        <Link href="/" style={{ color: "#888", textDecoration: "none" }}>
          ← Back to gracechen.io
        </Link>
      </p>
      <h1 style={{ fontSize: 40, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Archive</h1>
      <p style={{ color: "#666", margin: "0 0 48px", lineHeight: 1.6 }}>
        Previous iterations of this portfolio, grouped by year. (And if you&apos;re reading this, I
        don&apos;t know how you found this but hello.)
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
              <li key={p.slug} style={{ padding: "10px 0", borderTop: "1px solid #eee" }}>
                <a
                  href={`/archive/${p.slug}`}
                  style={{
                    color: "#111",
                    textDecoration: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <span>{p.title || p.slug}</span>
                  <span style={{ color: "#bbb", fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
                    /{p.slug}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
