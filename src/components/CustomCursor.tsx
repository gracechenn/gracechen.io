"use client";

import PageBehaviors from "./PageBehaviors";

/**
 * Renders the custom pixel-cursor markup and runs the `cursor` behavior.
 *
 * Core pages get this markup for free from their injected Webflow HTML, but the
 * shared `main.css` sets `a { cursor: none }` (and `html.has-custom-cursor *`)
 * unconditionally. Bespoke React pages that don't inject that HTML — e.g. the
 * clean `/archive` index — would therefore hide the native cursor over links
 * with nothing to replace it. Dropping this component in restores the working
 * pixel cursor (tracking + link-hover pointer glyph) so a cursor is always
 * visible, consistent with the core pages.
 *
 * The markup mirrors `#cursor-wrapper` in `src/content/home.html`; it's injected
 * as raw HTML (same as the core pages) so the `cursor()` behavior can query it.
 */
const CURSOR_MARKUP = `
<div id="cursor" class="cursor new">
  <img src="/assets/images/cursor-copy.png" sizes="100vw" srcset="/assets/images/cursor-copy-p-500.png 500w, /assets/images/cursor-copy-p-800.png 800w, /assets/images/cursor-copy.png 1030w" alt="" class="hover">
  <img src="/assets/images/side.png" alt="" class="side">
  <img src="/assets/images/pointer.png" sizes="(max-width: 647px) 100vw, 647px" srcset="/assets/images/pointer-p-500.png 500w, /assets/images/pointer.png 647w" alt="" class="point">
</div>`;

export default function CustomCursor() {
  return (
    <>
      <div id="cursor-wrapper" className="cursor-wrapper" dangerouslySetInnerHTML={{ __html: CURSOR_MARKUP }} />
      <PageBehaviors behaviors={["cursor"]} />
    </>
  );
}
