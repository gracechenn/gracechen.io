/**
 * Server-side constants for the `/untitled-deck` password gate.
 *
 * There is NO persisted authentication: the password must be entered on every
 * visit. A correct submit mints a SINGLE-USE grant cookie that the middleware
 * consumes (deletes) the moment it serves the deck, so it never survives to a
 * later navigation (see `src/middleware.ts`). The password itself is NOT kept
 * here: it is read server-side from `process.env.DECK_PASSWORD` at the point of
 * comparison (in the middleware), so it is never shipped to the client and never
 * committed to source. If the env var is unset, the gate fails closed.
 *
 * The unauthenticated password page is the Webflow "Protected page" design,
 * served (via a middleware rewrite) from `GATE_HTML`. Both it and the deck live
 * under `public/archive/` and carry a `<base href="/archive/">` so their relative
 * `css/js/images` assets resolve even though the visible URL is `DECK_PATH`.
 */

// The single public (vanity) URL for the deck. Everything — the gate, the POST
// target, the grant cookie scope, and the served deck — stays on this path, so
// the browser's address bar never leaves `/untitled-deck`.
export const DECK_PATH = "/untitled-deck";

// The raw Webflow HTML files served (via internal middleware rewrites) at
// `DECK_PATH`. Rewrites keep the visible URL on `DECK_PATH` while serving these.
export const DECK_HTML = "/archive/deck.html";
export const GATE_HTML = "/archive/deck-gate.html";

// One-time grant: set only on a correct password POST and deleted by the very
// next request that serves the deck. NOT a persistent login.
export const GRANT_COOKIE = "deck_grant";
export const GRANT_TOKEN = "1";
