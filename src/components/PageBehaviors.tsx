"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Cleanup = void | (() => void);

/**
 * Decorative custom cursor that follows the pointer and reacts on hover
 * (replaces Webflow's IX2 cursor interactions). Faithful to the original:
 *   - a-8  "Move Cursor" (MOUSE_MOVE): the cursor tracks the pointer.
 *   - a-9/a-10 (MOUSE_OVER/OUT): the old pink-dot cursor grows to 2× and fades
 *     to 0.75 opacity over interactive elements (500ms outQuart), see CSS.
 *   - a-72/a-73 "pixel cursor" (MOUSE_OVER/OUT): the newer glyph cursor swaps
 *     its default image (.hover) for the pointer image (.point), see CSS.
 * Webflow bound these to each link individually via data-w-id; the migration
 * stripped those hooks, so we delegate off the interactive elements instead.
 */
function cursor(): Cleanup {
  const wrap = document.getElementById("cursor-wrapper");
  if (!wrap) return;
  const dot = document.getElementById("cursor") ?? wrap.querySelector<HTMLElement>(".cursor");
  const root = document.documentElement;
  root.classList.add("has-custom-cursor");

  const move = (e: PointerEvent) => {
    wrap.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
  };
  window.addEventListener("pointermove", move);

  // Hover state, toggled as the pointer enters/leaves interactive elements.
  // `.sizzle-reel .x` is the card-modal close button (a clickable div, not an
  // <a>/<button>), so it's listed explicitly to get the pointer pixel-cursor on
  // hover like the nav/socials links (Webflow a-72/a-73). `[data-sizzle]` are the
  // homepage project cards (clickable to open the modal) — same treatment, and
  // NOT forced to a native `cursor:pointer` so the global `cursor:none` holds.
  const INTERACTIVE =
    'a, button, [role="button"], input, textarea, select, label, summary, .w-lightbox, .sizzle-reel .x, [data-sizzle]';
  let hoverEl: Element | null = null;
  const onOver = (e: PointerEvent) => {
    const target = (e.target as Element | null)?.closest(INTERACTIVE) ?? null;
    if (target === hoverEl) return;
    hoverEl = target;
    dot?.classList.toggle("is-hovering", !!target);
  };
  document.addEventListener("pointerover", onOver);

  return () => {
    window.removeEventListener("pointermove", move);
    document.removeEventListener("pointerover", onOver);
    dot?.classList.remove("is-hovering");
    root.classList.remove("has-custom-cursor");
  };
}

/** Mobile hamburger toggle (replaces Webflow's w-nav runtime). */
function nav(): Cleanup {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>(".w-nav-button"));
  const handlers: Array<[HTMLElement, () => void]> = [];
  for (const btn of buttons) {
    const container = btn.closest<HTMLElement>(".w-nav");
    if (!container) continue;
    const handler = () => {
      const open = container.getAttribute("data-nav-open") === "true";
      container.setAttribute("data-nav-open", String(!open));
    };
    btn.addEventListener("click", handler);
    handlers.push([btn, handler]);
  }
  return () => handlers.forEach(([btn, h]) => btn.removeEventListener("click", h));
}

/**
 * Home: the project cards stack on top of each other as you scroll, then the two
 * blue "folder" halves close over the finished stack. Re-authored replacement
 * for the original Webflow IX2 interaction that was removed during the migration.
 *
 * The base "stacking" is pure CSS `position: sticky` (see `.card-div` in
 * main.css) — each card sticks to the top of the viewport, so later cards layer
 * over earlier ones. The migration broke this because `.card-section` is a
 * `position: fixed` internal-scroll container, so the window never scrolled and
 * the sticky stack never engaged. This behavior fixes that and adds the folder
 * close:
 *   1. Adds `.home-scroll` to <html>, switching `.card-section` into normal flow
 *      so the *window* is the scroller (native scroll, like the Webflow original;
 *      see the `html.home-scroll` CSS block).
 *   2. Scrubs the two `.glass` folder halves shut with a 3D rotate as the folder
 *      scrolls up into view, from the original Webflow interaction (IX2 action
 *      list "a-82", SCROLLING_IN_VIEW). Values verified exact against the live
 *      Webflow DOM; center transform-origin and no perspective (Webflow sets
 *      neither), so the rotate renders like the original:
 *        front .glass:      0% rotateX 90, skewX -35, move(10vw,20vh)
 *                          79% rotateX 7,  skewX -3,  move(-1vw,0)
 *        back  .glass.back: 0% rotateX -90, opacity 0, skewX 40, move(-30vw,100vh)
 *                          50% opacity 1
 *                          70% rotateX 0,  skewX 3,  move(-1.3vw,0)  (Webflow)
 *      Webflow ends the back's transform at 70% and the front's at 79%, so the
 *      back closes ~9% sooner; we run the back's transform over the same 0.79 as
 *      the front so both halves close in sync (see the fromTo below).
 */
function homeStack(): Cleanup {
  const section = document.querySelector<HTMLElement>(".card-section");
  if (!section) return;

  const root = document.documentElement;
  root.classList.add("home-scroll");

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    // Reduced motion: keep the page a plain, readable scroll (cards still stack
    // via CSS sticky) with no smooth scroll and no scrubbed folder animation.
    return () => root.classList.remove("home-scroll");
  }

  gsap.registerPlugin(ScrollTrigger);

  // Native browser scroll (like Webflow) — ScrollTrigger listens to it by
  // default, so there's no smooth-scroll library adding lag.

  // The interaction targets the inner `.glass` elements (not the card wrappers):
  // `.glass` is the front flap; `.glass.back` is the back half.
  const front = section.querySelector<HTMLElement>(".card-div.folder:not(.phone) .glass");
  const back = section.querySelector<HTMLElement>(".card-div.folder-copy .glass.back");
  const frontCard = section.querySelector<HTMLElement>(".card-div.folder:not(.phone)");

  let folderTl: gsap.core.Timeline | null = null;
  let folderST: ScrollTrigger | null = null;
  let folderTick: (() => void) | null = null;
  // Desktop only: on mobile `.folder` / `.folder-copy` are display:none and a
  // single static `.folder.phone` flap is shown instead, matching the original
  // interaction (which never animated the phone glass).
  if (front && frontCard && getComputedStyle(frontCard).display !== "none") {
    // Webflow IX2 "Smoothing" (0–100%) is NOT a time-based scrub. Decoded from
    // the IX2 engine (public/archive/js/webflow.js, the IX2_ANIMATION_FRAME_CHANGED
    // handler), it's a per-frame low-pass lerp on the interaction progress:
    //
    //   O = Math.max(1 - f, .01)               // f = smoothing% / 100
    //   R = optimizeFloat(max(target, 0) - c)  // c = current smoothed progress
    //   N = optimizeFloat(c + R * O)           // next smoothed progress
    //     ⇒  progress += (target - progress) * max(1 - smoothing, .01)
    //
    // run once per rAF tick (no delta-time normalization; optimizeFloat rounds to
    // 5dp and snaps |x| ≤ 1e-4 to 0). We reproduce it exactly below via a
    // gsap.ticker loop that reads the raw scroll progress, eases a smoothed
    // progress toward it with this factor, then applies folderTl.progress(smoothed).
    // Dial FOLDER_SMOOTHING (0–1) to match Webflow's slider.
    const FOLDER_SMOOTHING = 0.64; // Webflow "Smoothing" slider = 64%
    const SMOOTH_COEF = Math.max(1 - FOLDER_SMOOTHING, 0.01); // Webflow O = 0.36
    // Both halves' transforms settle here. Front's Webflow end is 79%; the back's
    // own Webflow end is 70%, but we run it to 79% too so the two settle together
    // (the ~9% difference is imperceptible under the smoothed window).
    const CLOSE_END = 0.79;
    // Webflow fades the back in over 0%→50% of the close (opacity 0→1).
    const BACK_FADE = 0.5;
    // The front flap's fold (rotateX/skewX) must not start until the folder is
    // actually entering the viewport. The `y` sweep (20vh→-4vh over 0→CLOSE_END)
    // is what raises the flap into view, but its rotateX/skewX previously ran from
    // 0% too — so the fold was ~80% done while the flap was still below the fold.
    // The flap's center is rotation-invariant (rotateX/skewX use the default
    // center origin); the fold is held open (rotateX 90, skewX -35) until
    // FOLD_START and runs FOLD_START→CLOSE_END, unfolding shut as the flap rises
    // into view (the `y`/x sweep, the back half, the -4vh end and the trigger
    // anchoring are all unchanged). Tuned to 0.30 (with the +560px end offset
    // below) so the close plays while the folder is framed on screen.
    const FOLD_START = 0.30;
    // Paused timeline driven manually by the smoothing loop (further below) rather
    // than by ScrollTrigger's own scrub, so the lag matches Webflow's per-frame
    // lerp exactly instead of GSAP's time-based catch-up.
    folderTl = gsap.timeline({
      defaults: { ease: "none" }, // IX2 easing was "Linear (None)"
      paused: true,
    });
    // Empty tween spanning the whole timeline so its total duration is exactly 1.
    // Every other tween's `duration` then reads directly as an IX2 keyframe
    // fraction (0.5 = 50%, 0.79 = 79%), and elements hold their final pose from
    // that keyframe through to 100% (the fully-closed, held state).
    folderTl.to({}, { duration: 1 }, 0);

    // Front flap (the dominant element): starts folded ~90deg open as a skewed
    // parallelogram (card visible behind), then rotates up and flattens to cover
    // the stack. The positional sweep (x/y) runs IX2 0% -> 79%; the rotateX/skewX
    // fold is gated to FOLD_START -> 79% (see below). Values verified exact against
    // the live Webflow DOM. transform-origin is left at the browser default (center, 50% 50%) —
    // Webflow sets none — which keeps the corners aligned and makes the flap read
    // as coming toward the viewer. The end `y` is tuned to -0.6vh (Webflow's
    // decoded value was 0vh) for the closed front half's resting vertical
    // position. Only the end vertical position differs from Webflow; timing/rate
    // stays in sync with the back.
    folderTl.fromTo(
      front,
      { x: "10vw", y: "20vh" },
      { x: "-1vw", y: "-0.6vh", duration: CLOSE_END },
      0,
    );
    // Fold gated to start only as the flap enters the viewport (FOLD_START), held
    // open before then via the immediate-render from-state, and settling shut at
    // the same CLOSE_END as the positional sweep.
    folderTl.fromTo(
      front,
      { rotationX: 90, skewX: -35 },
      { rotationX: 7, skewX: -3, duration: CLOSE_END - FOLD_START },
      FOLD_START,
    );

    if (back) {
      // Back navy half: folded the opposite way and translated a full viewport
      // below the fold (y:100vh), rotating up into its framing position. Center
      // origin (Webflow default). Values re-verified frame-by-frame against the
      // live IX2 panel: rotateX -90→0, skewX 40→3, x -30vw→-1.3vw, y 100vh→0.
      //
      // Webflow ends the back's transform at 70% and the front's at 79%; we run
      // the back to CLOSE_END (79%) too so both halves scrub at the same rate and
      // settle together (the ~9% is imperceptible under the scrubbed window).
      folderTl.fromTo(
        back,
        { rotationX: -90, skewX: 40, x: "-30vw", y: "100vh" },
        { rotationX: 0, skewX: 3, x: "-1.3vw", y: "0vh", duration: CLOSE_END },
        0,
      );
      // Restore Webflow's back fade: opacity 0→1 over 0%→50% (BACK_FADE), on the
      // same front-anchored scroll. This is the crux of the close reading right:
      // the back still travels up from y:100vh, but it's INVISIBLE through the
      // low/fast part of that sweep and only resolves in as it nears its framing
      // spot behind the cards — so it "reveals via fade" rather than reading as a
      // solid sweep-up (the bug when it was fully opaque). Set here via GSAP,
      // which overrides the CSS `.glass.back` opacity at runtime (no CSS change).
      // Runs from frame 0 alongside the transform, so both halves rise together.
      folderTl.fromTo(
        back,
        { opacity: 0 },
        { opacity: 1, duration: BACK_FADE },
        0,
      );
    }

    // Webflow smoothing loop. A standalone ScrollTrigger (no scrub) just reports
    // the raw scroll progress across the folder-close window; a gsap.ticker loop
    // then eases a smoothed progress toward that target each rAF frame with the
    // decoded IX2 factor and drives the paused timeline. Anchored to the folder
    // itself so the close is decoupled from how many cards precede it: it plays
    // over the ~1 viewport the folder takes to rise from the bottom of the screen
    // (open, last card revealed) to the top (shut, thank-you covering the stack).
    // start "top bottom+=20%" fires ~20% of a viewport early (less runway before
    // the halves appear); the end is "top center" pushed +END_OFFSET px later
    // (further down-scroll) so progress 1.0 lands when the folder is framed on
    // screen rather than while it's still rising into view. Given as an absolute
    // scroll value (numeric) — the equivalent of "top center" (trigger top at
    // viewport center) plus END_OFFSET px — because the "top center+=" string
    // offset resolves the wrong direction here.
    const END_OFFSET = 560; // px past "top center" (tuned)
    const endScroll = () =>
      frontCard.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.5 + END_OFFSET;
    folderST = ScrollTrigger.create({
      trigger: frontCard,
      start: "top bottom+=20%", // Webflow 0% was "element starts entering"
      end: endScroll,
    });
    let smoothed = 0;
    folderTick = () => {
      const target = folderST ? folderST.progress : 0; // raw 0→1 from scroll
      // Webflow: N = c + (target - c) * max(1 - smoothing, .01), once per frame.
      let next = smoothed + (target - smoothed) * SMOOTH_COEF;
      // optimizeFloat behavior: snap a negligible remaining delta to the target.
      if (Math.abs(target - next) <= 1e-4) next = target;
      smoothed = next;
      folderTl?.progress(smoothed);
    };
    gsap.ticker.add(folderTick);
  }

  // Images load lazily, which shifts element heights; recompute once settled.
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh);
  const refreshTimer = window.setTimeout(refresh, 600);

  return () => {
    window.removeEventListener("load", refresh);
    window.clearTimeout(refreshTimer);
    if (folderTick) gsap.ticker.remove(folderTick);
    folderST?.kill();
    folderTl?.kill();
    root.classList.remove("home-scroll");
  };
}

/**
 * Home: click a project card to open its case-study preview in a FULLSCREEN
 * MODAL. Faithful port of the Webflow "sizzle in" MOUSE_CLICK interactions whose
 * `data-w-id` hooks were stripped at migration (a-86 "ig sizzle in", a-80
 * "roblox", a-97 "ember", a-102 "bwxd").
 *
 * Structure (home.html): each project card image carries `data-sizzle="<key>"`;
 * clicking it reveals the matching overlay `.sizzle-reel[data-sizzle-reel=key]`.
 * The overlay is a `position: fixed; inset: 0` frosted cover (#f3f3f333 +
 * blur(20px), z-index above the nav/socials) that flex-centers the project's
 * media card `.card-image-home` (70vw, aspect 3/2.1, radius 5vw, big soft
 * shadow) holding the per-card media (IG NDA teaser, Roblox Vimeo, Ember/BWxD
 * gifs). The Vimeo embed is loaded lazily on first open (`data-src` -> `src`) so
 * a hidden autoplay iframe never loads on page load.
 *
 * Open animation (decoded IX2 a-86), 1000ms Webflow "outExpo" (GSAP `expo.out`):
 *   - the modal's `.card-image-home` eases scale 0.55 -> 1, rotateY 180 -> 0deg,
 *     rotateZ -1.5 -> +1.5deg while the overlay fades opacity 0 -> 1;
 *   - the underlying front card `.card-image1` flips WITH it (rotateY 0 -> 180,
 *     scale 1 -> 1.7) behind the frosted cover.
 * Close ("sizzle out", IX2 a-87 et al) is a separate interaction that unflips
 * the card back — media -> its shrunk/mirrored pose, front card -> its resting
 * front-facing pose, overlay opacity -> 0, then `display: none`. Decoded from
 * webflow.js it reuses the SAME `outExpo` (GSAP `expo.out`) at 1000ms for every
 * property (applied forward to the closed pose, not time-reversed). Closing is
 * triggered by a click/tap ANYWHERE over the open modal (backdrop OR the media
 * card), the `.x` button, or Esc.
 *
 * While open, the <html> gets `.modal-open` (body scroll-lock) and the fixed
 * overlay covers the nav, left socials and `.button_clear` captions. Reduced
 * motion keeps the modal + close affordances + scroll-lock fully working, just
 * without the scale/rotate/fade animation (instant open/close).
 */
function homeCardFlip(): Cleanup {
  const triggers = Array.from(document.querySelectorAll<HTMLElement>("[data-sizzle]"));
  const reels = Array.from(document.querySelectorAll<HTMLElement>("[data-sizzle-reel]"));
  if (!triggers.length || !reels.length) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  // IX2 "sizzle in": the modal media card eases from the mirrored/shrunk pose to
  // its resting pose over 1000ms outExpo. Start values mirror the inline
  // transform in home.html; rest values match the live site's resting transform.
  // `rotationX: 0` is pinned explicitly on every 3D pose: a bare rotateY(180) is
  // ambiguous and GSAP can decompose it as rotateX(180)+rotateZ(180), which would
  // leave the element mirrored at rest. Pinning X keeps the flip on the Y axis.
  const START = { scale: 0.55, rotationX: 0, rotationY: 180, rotation: -1.5, x: 0, y: 0, transformStyle: "preserve-3d" as const };
  const REST = { scale: 1, rotationX: 0, rotationY: 0, rotation: 1.5, x: 0, y: 0, transformStyle: "preserve-3d" as const };
  // Front card `.card-image1` flips in sync (IX2: rotateY 0->180, scale 1->1.7);
  // it rests front-facing at its natural identity pose (matches the closed grid).
  // Beyond the Webflow flip, we also translate the front card to the VIEWPORT
  // CENTER during open (per-open computed `x`/`y`, see `open()`), so it flips in
  // the middle of the screen behind the frosted blur rather than at its stacked
  // spot. `x`/`y` are pinned to 0 in the rest pose so close returns it exactly.
  const FRONT_OPEN = { scale: 1.7, rotationX: 0, rotationY: 180, transformStyle: "preserve-3d" as const };
  const FRONT_REST = { scale: 1, rotationX: 0, rotationY: 0, x: 0, y: 0, transformStyle: "preserve-3d" as const };
  const DUR = 1; //          IX2 duration 1000ms (open a-86 AND close a-87)
  const OPEN_EASE = "expo.out"; // Webflow "sizzle in" outExpo
  // Webflow's "sizzle out" (a-87/a-81/a-96/a-101/a-79) is a SEPARATE interaction,
  // but decoded from webflow.js it uses the same token `outExpo` at duration 1e3
  // for every property (media scale/rotate, overlay opacity, front rotate/scale)
  // — applied FORWARD toward the closed pose, not a time-reversed ease. So the
  // faithful close ease is also expo.out (NOT expo.in).
  const CLOSE_EASE = "expo.out"; // Webflow "sizzle out" outExpo, 1000ms

  // A card may have more than one front element (e.g. the Ember card stacks an
  // animated `.ember-hero` gif over its `.card-image1`); flip them all together.
  const frontsOf = (key: string) => triggers.filter((t) => t.dataset.sizzle === key);
  const mediaOf = (reel: HTMLElement) => reel.querySelector<HTMLElement>(".card-image-home");
  let openReel: HTMLElement | null = null;
  let openFronts: HTMLElement[] = [];

  // An element's UNTRANSFORMED viewport rect (center + layout size), computed by
  // dividing out any live GSAP transform. Lets us read a front card's true
  // stacked position/size even while it's mid-flip (scaled/translated/rotated).
  const restRectOf = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const tx = Number(gsap.getProperty(el, "x")) || 0;
    const ty = Number(gsap.getProperty(el, "y")) || 0;
    const sx = Number(gsap.getProperty(el, "scaleX")) || 1;
    const sy = Number(gsap.getProperty(el, "scaleY")) || 1;
    return { cx: r.left + r.width / 2 - tx, cy: r.top + r.height / 2 - ty, w: r.width / sx, h: r.height / sy };
  };

  // The primary front face of a card (its `.card-image1`; falls back to the
  // first trigger, e.g. Ember stacks a `.ember-hero` gif over the image).
  const primaryFront = (fronts: HTMLElement[]) =>
    fronts.find((f) => f.classList.contains("card-image1")) ?? fronts[0] ?? null;

  // The front-card thumbnails (`.card-image1`) are PNGs that draw the actual
  // card ARTWORK inset within a larger, mostly-transparent canvas — the visible
  // card only fills part of the image's element box. Measured across all four
  // cards (ig/robloc/ember2/bwxd, canvas alpha-bounds scan) the artwork is highly
  // consistent: ~81% of the box width, ~76% of the box height, horizontally
  // centered, and sitting ~1% of the height above the box's vertical center.
  // The modal media (`.card-image-home`) is a solid DIV whose white card fills
  // its WHOLE box, so tying the media to the front's raw element box lands the
  // back ~23% larger than the front's visible card — the "back looks bigger"
  // seam. We tie to the front's VISIBLE artwork box instead.
  const CARD_ART_W = 0.81; // visible artwork width  ÷ front element box width
  const CARD_ART_H = 0.76; // visible artwork height ÷ front element box height
  const CARD_ART_CY = 0.489; // visible artwork vertical center, as a fraction of the box

  // FLIP tie: the media card's pose (translate + scale) that makes it land
  // EXACTLY on the given front card's VISIBLE artwork box (same center + width
  // AND height), still folded away (rotateY 180) as the modal's mirror face.
  // Open grows FROM this pose to REST (centered); close shrinks TO it, so both
  // faces converge on the front card in the stack and read as one seamless card.
  // The modal media and the front artwork don't share an aspect ratio (e.g. the
  // Roblox media is `aspect-ratio: 3/2.1`, the Ember media is #000-boxed), so a
  // single uniform scale can only line up ONE axis. We scale each axis
  // independently against the visible artwork — scaleX to the artwork width,
  // scaleY to the artwork height — so the collapsed back box matches the front
  // card's on-screen card precisely (not its padded element box) and there's no
  // size-pop when the modal is removed. Returns null if there's no front card or
  // media (caller falls back to the centered collapse).
  const mediaFrontPose = (media: HTMLElement, front: HTMLElement | null) => {
    if (!front) return null;
    const fr = restRectOf(front);
    const mr = restRectOf(media);
    const mW = media.offsetWidth || mr.w || fr.w;
    const mH = media.offsetHeight || mr.h || fr.h;
    // Front card's VISIBLE artwork box (inset within its transparent PNG canvas).
    const artW = fr.w * CARD_ART_W;
    const artH = fr.h * CARD_ART_H;
    const artCx = fr.cx; // artwork is horizontally centered in the box
    const artCy = fr.cy + (CARD_ART_CY - 0.5) * fr.h; // ~1% above box center
    return {
      x: artCx - mr.cx,
      y: artCy - mr.cy,
      scaleX: artW / mW,
      scaleY: artH / mH,
      rotationX: 0,
      rotationY: 180,
      rotation: -1.5,
      transformStyle: "preserve-3d" as const,
    };
  };

  // OPEN pose for the PRIMARY front card — the mirror of `mediaFrontPose`, and the
  // key to a flip that reads as ONE card the WHOLE way (not just at the endpoints).
  // A flip has two faces (here two separate elements: the modal `media` and the
  // stack `front`). For it to look seamless the two faces must occupy the SAME
  // on-screen box at EVERY frame. They already share `expo.out` + duration, so it's
  // enough to make their boxes match at BOTH endpoints — then the interpolation
  // matches at every frame in between. The close endpoint already matches
  // (`mediaFrontPose` lands the media on the front's rest artwork box). The OPEN
  // endpoint did NOT: the media rests at its natural aspect while the front flipped
  // to a uniform scale 1.7, so their boxes only converged at the very last frame,
  // leaving the media visibly wider/shorter/offset mid-flip. Here we instead scale
  // the front NON-UNIFORMLY so its VISIBLE artwork box equals the media's natural
  // REST box, and position it so the artwork centers on the media. The front is
  // hidden behind the frosted blur while open, so this stretch is invisible there;
  // on close it resolves to FRONT_REST (identity) in lockstep with the media
  // resolving to the front artwork box. Returns null (caller uses FRONT_OPEN) when
  // there's no front/media.
  const frontOpenPose = (front: HTMLElement | null, media: HTMLElement | null) => {
    if (!front || !media) return null;
    const fr = restRectOf(front);
    const mr = restRectOf(media);
    const mW = media.offsetWidth || mr.w;
    const mH = media.offsetHeight || mr.h;
    const fW = front.offsetWidth || fr.w;
    const fH = front.offsetHeight || fr.h;
    // Non-uniform: front's visible artwork (fW·ART_W × fH·ART_H) == media box (mW×mH).
    const scaleX = mW / (fW * CARD_ART_W);
    const scaleY = mH / (fH * CARD_ART_H);
    // Land the front's (slightly-high) artwork center on the media's rest center.
    const artOffsetY = (0.5 - CARD_ART_CY) * fH * scaleY;
    return {
      x: mr.cx - fr.cx,
      y: mr.cy + artOffsetY - fr.cy,
      scaleX,
      scaleY,
      rotationX: 0,
      rotationY: 180,
      transformStyle: "preserve-3d" as const,
    };
  };

  const open = (key: string) => {
    const reel = reels.find((r) => r.dataset.sizzleReel === key);
    if (!reel || openReel === reel) return;
    openReel = reel;
    openFronts = frontsOf(key);

    // Safety net: ensure deferred embeds are loaded (normally already preloaded
    // during idle time after load — see preloadEmbeds below). Idempotent.
    reel.querySelectorAll<HTMLIFrameElement>("iframe[data-src]").forEach((f) => {
      if (!f.src) f.src = f.dataset.src ?? "";
    });

    reel.style.display = "flex";
    root.classList.add("modal-open"); // body scroll-lock

    const media = mediaOf(reel);
    if (reduce) {
      reel.style.opacity = "1";
      if (media) gsap.set(media, REST);
      return; // front card stays at its resting pose (no flip) under reduced motion
    }
    gsap.killTweensOf(reel);
    gsap.fromTo(reel, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" });
    if (media) {
      gsap.killTweensOf(media);
      // Grow from the front card's rect (seamless tie) to the centered REST pose;
      // fall back to the centered collapse if the card has no front element.
      const from = mediaFrontPose(media, primaryFront(openFronts)) ?? START;
      gsap.fromTo(media, from, { ...REST, duration: DUR, ease: OPEN_EASE, overwrite: "auto" });
    }
    // The PRIMARY front (the `.card-image1` the media ties to) flips to the pose
    // that keeps it box-identical to the media at every frame (see frontOpenPose).
    const primary = primaryFront(openFronts);
    const primaryPose = media ? frontOpenPose(primary, media) : null;
    openFronts.forEach((front) => {
      gsap.killTweensOf(front);
      if (front === primary && primaryPose) {
        gsap.to(front, { ...primaryPose, duration: DUR, ease: OPEN_EASE, overwrite: "auto" });
        return;
      }
      // Secondary fronts (e.g. Ember's `.ember-hero` gif) keep the Webflow flip:
      // center the flipping card on the viewport (center is fixed under
      // scale/rotate with origin 50% 50%, and GSAP `x`/`y` translate in screen px,
      // so target offset = current translate + (viewport center − current center);
      // adding the current translate keeps it robust to re-opening mid-close and to
      // any window size) and scale to FRONT_OPEN.
      const curX = Number(gsap.getProperty(front, "x")) || 0;
      const curY = Number(gsap.getProperty(front, "y")) || 0;
      const r = front.getBoundingClientRect();
      const dx = curX + (window.innerWidth / 2 - (r.left + r.width / 2));
      const dy = curY + (window.innerHeight / 2 - (r.top + r.height / 2));
      gsap.to(front, { ...FRONT_OPEN, x: dx, y: dy, duration: DUR, ease: OPEN_EASE, overwrite: "auto" });
    });
  };

  const close = () => {
    const reel = openReel;
    if (!reel) return;
    const fronts = openFronts;
    openReel = null;
    openFronts = [];
    root.classList.remove("modal-open");

    const media = mediaOf(reel);
    const hide = () => {
      reel.style.display = "none";
      reel.style.opacity = "0";
    };
    if (reduce) {
      hide();
      fronts.forEach((front) => gsap.set(front, FRONT_REST));
      return;
    }
    // Reverse ("unflip") the whole open animation over the same 1000ms. The media
    // shrinks/folds back onto the triggering front card's live stacked rect (not
    // a center-collapse), so the modal back face lands seamlessly on the front
    // face as the overlay fades out. Measured live at close so it stays correct
    // regardless of scroll/stack position.
    gsap.killTweensOf(reel);
    gsap.to(reel, { opacity: 0, duration: DUR, ease: CLOSE_EASE, onComplete: hide });
    if (media) {
      gsap.killTweensOf(media);
      const to = mediaFrontPose(media, primaryFront(fronts)) ?? START;
      gsap.to(media, { ...to, duration: DUR, ease: CLOSE_EASE, overwrite: "auto" });
    }
    fronts.forEach((front) => {
      gsap.killTweensOf(front);
      gsap.to(front, { ...FRONT_REST, duration: DUR, ease: CLOSE_EASE, overwrite: "auto" });
    });
  };

  const cleanups: Array<() => void> = [];

  // Preload deferred reel embeds (e.g. the Roblox Vimeo) during idle time shortly
  // after load, so the modal flips open to an ALREADY-loaded video instead of a
  // visible on-open load delay. The embed is muted (autoplay=1&muted=1&loop=1),
  // so background preloading never plays sound, and the black-until-loaded
  // fallback still covers the Roblox card until the frame is actually ready.
  // `open()` also loads on demand as an idempotent safety net.
  const preloadEmbeds = () => {
    reels.forEach((reel) =>
      reel.querySelectorAll<HTMLIFrameElement>("iframe[data-src]").forEach((f) => {
        if (!f.src) f.src = f.dataset.src ?? "";
      }),
    );
  };
  const ric = window.requestIdleCallback;
  if (typeof ric === "function") {
    const handle = ric(preloadEmbeds, { timeout: 2500 });
    cleanups.push(() => window.cancelIdleCallback?.(handle));
  } else {
    const t = window.setTimeout(preloadEmbeds, 1200);
    cleanups.push(() => window.clearTimeout(t));
  }

  for (const trigger of triggers) {
    // No inline `cursor:pointer` here — it would beat the global
    // `html.has-custom-cursor * { cursor: none }` rule and resurface the native
    // cursor over the cards. The custom pointer pixel-cursor is driven instead by
    // adding `[data-sizzle]` to the cursor behavior's INTERACTIVE selector above.
    const onClick = () => open(trigger.dataset.sizzle ?? "");
    trigger.addEventListener("click", onClick);
    cleanups.push(() => {
      trigger.removeEventListener("click", onClick);
    });
  }

  // Tap/click ANYWHERE over the open overlay closes it — the frosted backdrop,
  // the media card, or the `.x` button (which bubbles up to the same handler).
  for (const reel of reels) {
    // Transparent capture layer above the media card + its (pointer-events:none)
    // Vimeo iframe. Cross-origin iframes swallow the window `pointermove` the
    // custom cursor listens on, so without this the pixel cursor freezes over
    // the Roblox video. This same-origin layer keeps `pointermove` firing (so
    // the cursor tracks) and, being covered by `html.has-custom-cursor *`
    // `cursor: none`, hides the native cursor over the video too. Clicks bubble
    // to the reel's click-anywhere-to-close handler below.
    const capture = document.createElement("div");
    capture.className = "reel-capture";
    reel.appendChild(capture);

    const onClose = () => close();
    reel.addEventListener("click", onClose);
    cleanups.push(() => {
      reel.removeEventListener("click", onClose);
      capture.remove();
    });
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);
  cleanups.push(() => document.removeEventListener("keydown", onKey));

  return () => {
    root.classList.remove("modal-open");
    reels.forEach((reel) => {
      gsap.killTweensOf(reel);
      const media = mediaOf(reel);
      if (media) gsap.killTweensOf(media);
    });
    triggers.forEach((t) => gsap.killTweensOf(t));
    cleanups.forEach((c) => c());
  };
}

/**
 * Home: project-card caption pills are VISIBLE by default and fade OUT as the
 * NEXT card scrolls up over the current one (then fade back in on reverse
 * scroll). Faithful port of the Webflow interactions (actionLists a-88…a-95,
 * "* scrolled in / in 2") on the `.button_clear` pills (ids …827ef IG, …224e
 * roblox, …ce7 ember, …27ca bwxd, …c60ec hab): decoding webflow.js, each caption
 * N is animated by the SCROLL_INTO_VIEW / SCROLL_OUT_OF_VIEW of caption N+1 —
 * opacity 1 -> 0 when N+1 enters view, 0 -> 1 when N+1 leaves — STYLE_OPACITY
 * over 500ms, linear, scrollOffset 0%. The chain: IG fades when roblox enters,
 * roblox when ember enters, ember when bwxd enters, bwxd when hab enters; the
 * last caption (hab) has no successor so it stays visible.
 *
 * The pills are hard-set `opacity:1` (inline + CSS) so they stay visible with JS
 * disabled or reduced motion; only the fade-out-on-cover is applied from JS and
 * cleared on teardown. Targets `.card-section .button_clear` only — distinct
 * from `homeStack` (`.glass`) and `homeCardFlip` (card images).
 */
function homeCaptions(): Cleanup {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const section = document.querySelector<HTMLElement>(".card-section");
  if (!section) return;
  const caps = Array.from(section.querySelectorAll<HTMLElement>(".button_clear"));
  if (caps.length < 2) return;

  // Captions start visible; each fades only when its successor covers it.
  gsap.set(caps, { opacity: 1 });

  // Map each TRIGGER caption (N+1) to the caption it fades (N).
  const fadeTargetOf = new Map<Element, HTMLElement>();
  for (let i = 0; i < caps.length - 1; i++) fadeTargetOf.set(caps[i + 1], caps[i]);

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        const target = fadeTargetOf.get(en.target);
        if (!target) return;
        gsap.to(target, {
          opacity: en.isIntersecting ? 0 : 1, // successor in view -> hide caption N
          duration: 0.5, //                      IX2 duration 500ms
          ease: "none", //                       IX2 easing "" (linear)
          overwrite: "auto",
        });
      });
    },
    { threshold: 0 }, // Webflow scrollOffsetValue 0%
  );
  // Observe the successor captions (every caption except the first); the last
  // caption is observed too (it fades its predecessor) but is never itself faded.
  caps.slice(1).forEach((c) => io.observe(c));

  return () => {
    io.disconnect();
    gsap.killTweensOf(caps);
    gsap.set(caps, { clearProps: "opacity" });
  };
}

/** About: sparkle trail following the pointer (ported from inline script). */
function sparkles(): Cleanup {
  const chars = ["✧", "˖", "°", "⋆", "｡", "˚"];
  const move = (e: MouseEvent) => {
    const sparkle = document.createElement("div");
    sparkle.className = "sparkle";
    sparkle.textContent = chars[Math.floor(Math.random() * chars.length)];
    document.body.appendChild(sparkle);
    sparkle.style.left = `${e.pageX}px`;
    sparkle.style.top = `${e.pageY}px`;
    sparkle.style.fontSize = `${12 + Math.random() * 8}px`;
    sparkle.style.transform = `rotate(${Math.random() * 360}deg)`;
    setTimeout(() => sparkle.remove(), 800);
  };
  document.addEventListener("mousemove", move);
  return () => document.removeEventListener("mousemove", move);
}

/**
 * About: resume cards tilt toward the pointer (ported from the inline script).
 *
 * DEVIATION FROM ORIGINAL: the Webflow inline script used a single global
 * `document` mousemove (gated by an IntersectionObserver) that tilted EVERY
 * in-view card toward the cursor whenever the mouse moved anywhere on the page,
 * normalised to the viewport. Per user preference this is now hover-scoped:
 * each card gets its own `mousemove`/`mouseleave` and only tilts while the
 * pointer is over it, fully independent of the others. The tilt magnitude/axis
 * mapping and easing are preserved from the original — factor 30,
 * `rotationX = deltaY`, `rotationY = -deltaX`, 0.5s `power3.out`, centre origin —
 * with the normalisation basis swapped from the viewport to each card's own
 * bounds (so ±15° at the card's edges). The old IntersectionObserver gate is
 * removed as redundant (you can only hover a visible card).
 */
function aboutCards(): Cleanup {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".div-44"));
  if (!cards.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const cleanups: Array<() => void> = [];
  for (const card of cards) {
    const onMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const cardX = rect.left + rect.width / 2;
      const cardY = rect.top + rect.height / 2;
      // Pointer offset from the card centre, normalised to the card's own size.
      const deltaX = rect.width ? ((e.clientX - cardX) / rect.width) * 30 : 0;
      const deltaY = rect.height ? ((e.clientY - cardY) / rect.height) * 30 : 0;
      gsap.to(card, {
        duration: 0.5,
        rotationX: deltaY,
        rotationY: -deltaX,
        ease: "power3.out",
        transformOrigin: "center center",
        overwrite: "auto",
      });
    };
    const onLeave = () => {
      gsap.to(card, {
        duration: 0.5,
        rotationX: 0,
        rotationY: 0,
        ease: "power3.out",
        transformOrigin: "center center",
        overwrite: "auto",
      });
    };
    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
    cleanups.push(() => {
      card.removeEventListener("mousemove", onMove);
      card.removeEventListener("mouseleave", onLeave);
      gsap.killTweensOf(card);
      gsap.set(card, { clearProps: "transform" });
    });
  }

  return () => cleanups.forEach((c) => c());
}

/** Playground: floating caption follows the pointer over each card image. */
function playHover(): Cleanup {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".card"));
  const bound: Array<[HTMLElement, string, EventListener]> = [];
  cards.forEach((card) => {
    const hoverBox = card.querySelector<HTMLElement>(".hover-box");
    const image = card.querySelector<HTMLElement>(".card-image");
    if (!hoverBox || !image) return;
    const onMove = (ev: Event) => {
      const e = ev as MouseEvent;
      // Each `.card` is its own stacking context (position: relative, z-index: 0),
      // so a later sibling card paints over the hovered card's `.hover-box`
      // (whose z-index only elevates it WITHIN its own card). Lift the whole
      // hovered card above its siblings so its rectangles render over every card.
      card.style.zIndex = "50";
      hoverBox.style.display = "block";
      hoverBox.style.left = `${e.clientX + 30}px`;
      hoverBox.style.top = `${e.clientY + 15}px`;
    };
    const onLeave = () => {
      hoverBox.style.display = "none";
      card.style.removeProperty("z-index");
    };
    image.addEventListener("mousemove", onMove);
    image.addEventListener("mouseleave", onLeave);
    bound.push([image, "mousemove", onMove as EventListener], [image, "mouseleave", onLeave]);
  });
  return () =>
    bound.forEach(([el, type, h]) => {
      el.removeEventListener(type, h);
      const card = el.closest<HTMLElement>(".card");
      card?.style.removeProperty("z-index");
    });
}

/** Playground: give each card image a subtle alternating tilt (fixed from the
 *  original export, whose inline script had a syntax error). */
function playRotate(): Cleanup {
  const images = Array.from(document.querySelectorAll<HTMLElement>(".card-image"));
  let toggle = true;
  images.forEach((img) => {
    const degree = Math.random() < 0.5 ? 1 : 2;
    const rotation = toggle ? -degree : degree;
    toggle = !toggle;
    img.style.transform = `rotate(${rotation}deg)`;
  });
}

/**
 * Home intro-paragraph parallax on `.text-block-6.home.new` (faithful to the
 * Webflow IX2 MOUSE_MOVE interactions whose `data-w-id` hooks were stripped at
 * migration). These are "mouse move OVER element" triggers (the event is bound
 * to the span via `useEventTarget`), so each tagline reacts ONLY while the
 * pointer is over itself, normalised to that element's own bounds: left/top edge
 * = −max, right/bottom edge = +max, centre = 0 (continuousParameterGroups
 * MOUSE_X / MOUSE_Y, TRANSFORM_MOVE, 500ms). Each element is fully independent —
 * moving over one never moves the other; leaving eases it back to 0.
 *   - "Design Engineer" (.tagline._1.new)  ±20px x / ±20px y  (IX2 a-56).
 *   - "建" (.tagline._2.new)               ±10px x / ±10px y  (IX2 a-65).
 *
 * Deliberately NOT bound here (verified against ix2):
 *   - The MOUSE_OVER/OUT "tooltip" show/hide (a-54/a-55, a-62/a-63) target
 *     `home-2023` element ids (713e90fd / 02b489cf) that don't exist on this
 *     page, so they're no-ops on the live site — no tooltip appears.
 *   - "design communities" (.text-span-11._1.underline.new): its MOUSE_MOVE
 *     (a-64) moves ONLY that same foreign hover-box, with no `useEventTarget`,
 *     so the span itself has no parallax on this page.
 */
function taglineHovers(): Cleanup {
  const scope = document.querySelector<HTMLElement>(".text-block-6.home.new");
  if (!scope) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Each tagline that parallaxes itself, with its decoded ± range (px).
  const specs: Array<{ sel: string; ax: number; ay: number }> = [
    { sel: ".tagline._1.new", ax: 20, ay: 20 }, // a-56 "Design Engineer"
    { sel: ".tagline._2.new", ax: 10, ay: 10 }, // a-65 "建"
  ];

  const cleanups: Array<() => void> = [];
  for (const { sel, ax, ay } of specs) {
    const el = scope.querySelector<HTMLElement>(sel);
    if (!el) continue;

    // Pointer normalised to -1..1 within THIS element's bounds (0 at centre).
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = rect.width ? ((e.clientX - rect.left) / rect.width) * 2 - 1 : 0;
      const ny = rect.height ? ((e.clientY - rect.top) / rect.height) * 2 - 1 : 0;
      gsap.to(el, {
        x: nx * ax,
        y: ny * ay,
        duration: 0.5, // IX2 duration 500ms
        ease: "power2.out",
        overwrite: "auto",
      });
    };
    const onLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "power2.out", overwrite: "auto" });
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    cleanups.push(() => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: "transform" });
    });
  }
  if (!cleanups.length) return;

  return () => cleanups.forEach((c) => c());
}

const REGISTRY: Record<string, () => Cleanup> = {
  cursor,
  nav,
  homeStack,
  homeCardFlip,
  homeCaptions,
  sparkles,
  aboutCards,
  playHover,
  playRotate,
  taglineHovers,
};

export default function PageBehaviors({ behaviors }: { behaviors: string[] }) {
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    for (const name of behaviors) {
      const fn = REGISTRY[name];
      if (!fn) continue;
      const cleanup = fn();
      if (typeof cleanup === "function") cleanups.push(cleanup);
    }
    return () => cleanups.forEach((c) => c());
  }, [behaviors]);
  return null;
}
