/**
 * Server-side constants for the `/deck` password gate.
 *
 * There is NO persisted authentication: the password must be entered on every
 * visit. A correct submit mints a SINGLE-USE grant cookie that the middleware
 * consumes (deletes) the moment it serves the deck, so it never survives to a
 * later navigation (see `src/middleware.ts`). The plaintext password lives only
 * here / in the middleware (server/edge, never shipped to the client).
 *
 * The unauthenticated password page is the Webflow "Protected page" design,
 * served (via a middleware rewrite) from `GATE_HTML` — kept under `/archive/` so
 * its relative `css/js/images` assets resolve.
 */
export const DECK_PASSWORD = "avocado";
export const GATE_HTML = "/archive/deck-gate.html";

// One-time grant: set only on a correct password POST and deleted by the very
// next request that serves the deck. NOT a persistent login.
export const GRANT_COOKIE = "deck_grant";
export const GRANT_TOKEN = "1";
