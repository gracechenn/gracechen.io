/** Which re-authored client behaviors run on each page. */
export const BEHAVIORS: Record<string, string[]> = {
  home: ["cursor", "nav", "lenis", "homeCards"],
  play: ["cursor", "nav", "playRotate", "playHover"],
  about: ["cursor", "nav", "sparkles", "aboutCards"],
  "not-found": ["cursor", "nav"],
};

/** Archived snapshots get the shared decorations plus generic tabs. */
export const ARCHIVE_DEFAULT = ["cursor", "nav", "tabs"];

export function behaviorsFor(key: string, isArchive: boolean): string[] {
  return BEHAVIORS[key] ?? (isArchive ? ARCHIVE_DEFAULT : ["cursor", "nav"]);
}
