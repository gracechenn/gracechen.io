"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import Lenis from "lenis";

type Cleanup = void | (() => void);

/** Decorative custom cursor that follows the pointer (replaces Webflow's IX2). */
function cursor(): Cleanup {
  const wrap = document.getElementById("cursor-wrapper");
  if (!wrap) return;
  const root = document.documentElement;
  root.classList.add("has-custom-cursor");
  const move = (e: PointerEvent) => {
    wrap.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
  };
  window.addEventListener("pointermove", move);
  return () => {
    window.removeEventListener("pointermove", move);
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

/** Generic Webflow-style tabs (used on a few archived case-study pages). */
function tabs(): Cleanup {
  const groups = Array.from(document.querySelectorAll<HTMLElement>(".w-tabs"));
  const handlers: Array<[HTMLElement, (e: Event) => void]> = [];
  for (const group of groups) {
    const links = Array.from(group.querySelectorAll<HTMLElement>(".w-tab-menu [data-w-tab]"));
    const panes = Array.from(group.querySelectorAll<HTMLElement>(".w-tab-pane"));
    for (const link of links) {
      const handler = (e: Event) => {
        e.preventDefault();
        const tab = link.getAttribute("data-w-tab");
        links.forEach((l) => l.classList.remove("is-current"));
        link.classList.add("is-current");
        panes.forEach((p) => {
          const match = p.getAttribute("data-w-tab") === tab;
          p.classList.toggle("is-tab-active", match);
          p.style.display = match ? "block" : "none";
        });
      };
      link.addEventListener("click", handler);
      handlers.push([link, handler]);
    }
  }
  return () => handlers.forEach(([el, h]) => el.removeEventListener("click", h));
}

/** Home: cards rotate in 3D as you scroll (ported from the original inline script). */
function homeCards(): Cleanup {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".card-div"));
  if (!cards.length) return;
  const onScroll = () => {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardTop = rect.top + window.scrollY;
      const cardCenter = cardTop + rect.height / 2;
      const screenCenter = scrollY + windowHeight / 2;
      const progress = cardCenter - screenCenter;
      const rotationX = gsap.utils.mapRange(-windowHeight / 2, windowHeight / 2, -100, 100)(progress);
      const rotationY = gsap.utils.mapRange(-windowHeight / 2, windowHeight / 2, 0, 20)(progress);
      gsap.to(card, {
        duration: 0.5,
        rotationX,
        rotationY,
        translateZ: 150,
        ease: "power3.out",
        transformOrigin: "center center",
      });
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  return () => window.removeEventListener("scroll", onScroll);
}

/** Home: Lenis smooth scrolling (ported; now self-hosted via npm, not CDN). */
function lenis(): Cleanup {
  const instance = new Lenis({ duration: 1.2, smoothWheel: true });
  let raf = 0;
  const update = (time: number) => {
    instance.raf(time);
    raf = requestAnimationFrame(update);
  };
  raf = requestAnimationFrame(update);
  return () => {
    cancelAnimationFrame(raf);
    instance.destroy();
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

/** About: resume cards tilt toward the pointer (ported from inline script). */
function aboutCards(): Cleanup {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".div-44"));
  if (!cards.length) return;
  const onMove = (e: MouseEvent) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardX = rect.left + rect.width / 2;
      const cardY = rect.top + rect.height / 2;
      const deltaX = ((mouseX - cardX) / window.innerWidth) * 30;
      const deltaY = ((mouseY - cardY) / window.innerHeight) * 30;
      gsap.to(card, {
        duration: 0.5,
        rotationX: deltaY,
        rotationY: -deltaX,
        ease: "power3.out",
        transformOrigin: "center center",
      });
    });
  };
  document.addEventListener("mousemove", onMove);
  return () => document.removeEventListener("mousemove", onMove);
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
      hoverBox.style.display = "block";
      hoverBox.style.left = `${e.clientX + 30}px`;
      hoverBox.style.top = `${e.clientY + 15}px`;
    };
    const onLeave = () => {
      hoverBox.style.display = "none";
    };
    image.addEventListener("mousemove", onMove);
    image.addEventListener("mouseleave", onLeave);
    bound.push([image, "mousemove", onMove as EventListener], [image, "mouseleave", onLeave]);
  });
  return () => bound.forEach(([el, type, h]) => el.removeEventListener(type, h));
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

const REGISTRY: Record<string, () => Cleanup> = {
  cursor,
  nav,
  tabs,
  homeCards,
  lenis,
  sparkles,
  aboutCards,
  playHover,
  playRotate,
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
