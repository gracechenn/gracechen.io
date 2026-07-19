/** Which re-authored client behaviors run on each cleanly-reimplemented page.
 *  (Archived pages are served as the raw Webflow export and run Webflow's own
 *  runtime, so they have no entries here.) */
export const BEHAVIORS: Record<string, string[]> = {
  home: ["cursor", "nav", "homeStack", "homeCardFlip", "homeCaptions", "taglineHovers"],
  play: ["cursor", "nav", "playRotate", "playHover"],
  about: ["cursor", "nav", "sparkles", "aboutCards"],
  "not-found": ["cursor", "nav"],
};

export function behaviorsFor(key: string): string[] {
  return BEHAVIORS[key] ?? ["cursor", "nav"];
}
