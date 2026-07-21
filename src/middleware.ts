import { NextResponse, type NextRequest } from "next/server";
import { GATE_HTML, GRANT_COOKIE, GRANT_TOKEN } from "@/lib/deckAuth";

/**
 * Password-gates the raw Webflow deck page with the Webflow-designed "Protected
 * page" as the password screen — and requires the password on EVERY visit. There
 * is no persisted login: a correct submit mints a SINGLE-USE grant that is
 * consumed (deleted) the instant the deck is served, so a later navigation shows
 * the gate again.
 *
 * The deck's real, working URL is the canonical `/archive/deck` (served from
 * `public/archive/deck.html` via the `/archive/:slug` rewrite, where its
 * relative `css/js/images` resolve under `/archive/`). The vanity `/deck` is
 * canonicalized to it.
 *
 * Flow (middleware runs BEFORE next.config rewrites, so the deck HTML is never
 * served without a live grant):
 *   - `/deck`, `/deck/*`                         → redirect to `/archive/deck`.
 *   - POST `/archive/deck[.html]` w/ correct pass → set the one-time grant cookie
 *     and redirect to `/archive/deck` (a GET the browser makes with that cookie).
 *   - POST with a wrong password                  → redirect to `/archive/deck?e=1`
 *     (the Webflow gate's inline script reads `e=1` to reveal its error).
 *   - GET `/archive/deck[.html]` WITH the grant   → serve the deck AND delete the
 *     grant in the same response, so it is single-use.
 *   - GET without a grant                         → REWRITE to the Webflow gate
 *     `GATE_HTML` (URL stays under `/archive/`, so the gate's assets resolve).
 *
 * Scope is narrow (see `config.matcher`): only the deck HTML paths are gated,
 * never the shared `/archive/css|js|images/…` assets or the Figma embed.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Canonicalize the vanity `/deck` (and any `/deck/*`) to `/archive/deck`.
  if (pathname === "/deck" || pathname.startsWith("/deck/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/archive/deck";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // A correct password POST mints a one-time grant and bounces to a GET of the
  // deck. The grant is short-lived purely as a safety net; it is consumed on the
  // very next request (below), so it never persists across visits.
  if (req.method === "POST") {
    let password = "";
    try {
      password = String((await req.formData()).get("pass") ?? "");
    } catch {
      password = "";
    }

    const url = req.nextUrl.clone();
    url.pathname = "/archive/deck";
    // Read the password server-side at request time (never inlined/shipped to
    // the client). Fail CLOSED: if it is unset or empty, no submission is ever
    // accepted, and if the submitted value is empty it can never match.
    const expected = process.env.DECK_PASSWORD ?? "";
    if (!expected) {
      console.warn(
        "DECK_PASSWORD env var is unset/empty — deck gate is failing closed (denying all access).",
      );
    }
    if (expected && password === expected) {
      url.search = "";
      const res = NextResponse.redirect(url, 303);
      res.cookies.set(GRANT_COOKIE, GRANT_TOKEN, {
        httpOnly: true,
        sameSite: "lax",
        path: "/archive/deck",
        maxAge: 30,
      });
      return res;
    }
    // Wrong password → back to the gate with the inline error flag.
    url.search = "e=1";
    return NextResponse.redirect(url, 303);
  }

  // GET with a live single-use grant → serve the deck (via the `/archive/:slug`
  // rewrite) and immediately delete the grant, so it cannot be reused.
  if (req.cookies.get(GRANT_COOKIE)?.value === GRANT_TOKEN) {
    const res = NextResponse.next();
    res.cookies.set(GRANT_COOKIE, "", { path: "/archive/deck", maxAge: 0 });
    return res;
  }

  // No grant (a fresh navigation): always show the gate. URL stays
  // `/archive/deck[.html]`, so the Webflow page's relative assets resolve, and
  // any `?e=1` flag is preserved in the browser URL for the inline script.
  const url = req.nextUrl.clone();
  url.pathname = GATE_HTML;
  url.search = "";
  return NextResponse.rewrite(url);
}

// Gate ONLY the specific deck HTML paths — never the shared `/archive/*` assets
// (css/js/images/fonts), the Webflow gate page itself, or the embedded iframe,
// which must load freely so both the gate and the deck render intact.
export const config = {
  matcher: ["/deck", "/deck/:path*", "/archive/deck", "/archive/deck.html"],
};
