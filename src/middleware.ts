import { NextResponse, type NextRequest } from "next/server";
import {
  DECK_HTML,
  DECK_PATH,
  GATE_HTML,
  GRANT_COOKIE,
  GRANT_TOKEN,
} from "@/lib/deckAuth";

/**
 * Password-gates the raw Webflow deck page with the Webflow-designed "Protected
 * page" as the password screen — and requires the password on EVERY visit. There
 * is no persisted login: a correct submit mints a SINGLE-USE grant that is
 * consumed (deleted) the instant the deck is served, so a later navigation shows
 * the gate again.
 *
 * The deck has ONE public URL: the vanity `DECK_PATH` (`/untitled-deck`). The
 * gate, the password POST, the grant cookie, and the served deck all stay on it,
 * so the browser's address bar never leaves `/untitled-deck`. The raw Webflow
 * files (`DECK_HTML`, `GATE_HTML`) live under `public/archive/` and are served
 * via internal REWRITES (which don't change the visible URL); a `<base
 * href="/archive/">` in each file makes their relative `css/js/images` resolve
 * under `/archive/` regardless of the URL shown.
 *
 * Flow (middleware runs BEFORE next.config rewrites, so the deck HTML is never
 * served without a live grant):
 *   - GET/POST `/archive/deck[.html]`             → redirect to `DECK_PATH` (the
 *     internal files are never a public, ungated backdoor).
 *   - POST `DECK_PATH` w/ correct password        → set the one-time grant cookie
 *     and redirect to `DECK_PATH` (a GET the browser makes with that cookie).
 *   - POST with a wrong password                  → redirect to `DECK_PATH?e=1`
 *     (the Webflow gate's inline script reads `e=1` to reveal its error).
 *   - GET `DECK_PATH` WITH the grant              → REWRITE to `DECK_HTML` (serve
 *     the deck) AND delete the grant in the same response, so it is single-use.
 *   - GET `DECK_PATH` without a grant             → REWRITE to the Webflow gate
 *     `GATE_HTML`. The visible URL (incl. any `?e=1`) is preserved for the gate's
 *     inline script.
 *
 * Scope is narrow (see `config.matcher`): only the deck paths are gated, never
 * the shared `/archive/css|js|images/…` assets or the Figma embed.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The internal Webflow files are served only via the rewrites below (which do
  // NOT re-run middleware). Any DIRECT external hit to them would be an ungated
  // backdoor, so bounce it to the single public URL.
  if (pathname === "/archive/deck" || pathname === "/archive/deck.html") {
    const url = req.nextUrl.clone();
    url.pathname = DECK_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Canonicalize any `/untitled-deck/*` subpath down to the bare `DECK_PATH`.
  if (pathname !== DECK_PATH) {
    const url = req.nextUrl.clone();
    url.pathname = DECK_PATH;
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
    url.pathname = DECK_PATH;
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
        path: DECK_PATH,
        maxAge: 30,
      });
      return res;
    }
    // Wrong password → back to the gate with the inline error flag.
    url.search = "e=1";
    return NextResponse.redirect(url, 303);
  }

  // GET with a live single-use grant → serve the deck (REWRITE, so the URL stays
  // `DECK_PATH`) and immediately delete the grant, so it cannot be reused.
  if (req.cookies.get(GRANT_COOKIE)?.value === GRANT_TOKEN) {
    const url = req.nextUrl.clone();
    url.pathname = DECK_HTML;
    url.search = "";
    const res = NextResponse.rewrite(url);
    res.cookies.set(GRANT_COOKIE, "", { path: DECK_PATH, maxAge: 0 });
    return res;
  }

  // No grant (a fresh navigation): always show the gate. REWRITE keeps the
  // visible URL on `DECK_PATH`, and any `?e=1` flag stays in the browser URL for
  // the gate's inline error script.
  const url = req.nextUrl.clone();
  url.pathname = GATE_HTML;
  return NextResponse.rewrite(url);
}

// Gate ONLY the deck paths — never the shared `/archive/*` assets (css/js/images/
// fonts) or the embedded Figma iframe, which must load freely so both the gate
// and the deck render intact. The `/archive/deck[.html]` entries exist only to
// redirect direct hits away (see above); the deck is served via internal rewrite.
export const config = {
  matcher: [
    "/untitled-deck",
    "/untitled-deck/:path*",
    "/archive/deck",
    "/archive/deck.html",
  ],
};
