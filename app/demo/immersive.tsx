"use client";

// Shared scroll-reveal primitive for the immersive demo surfaces (landing,
// /demo/customer, /demo/admin, /demo/branch). One IntersectionObserver-backed
// hook instead of four builders each hand-rolling their own — see
// app/demo/DIRECTION.md "Motion vocabulary" for which qp-reveal-* class to
// pair this with per section.

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

/** Longest reveal in the family: 560ms transition + the 420ms qp-delay-6
 *  stagger, plus slack. By this point `.qp-in` must have landed. */
const REVEAL_LANDED_BY_MS = 1200;

/** Force the reveal's end state on the node, with no transition involved.
 *  Written as inline styles rather than a class so a later React re-render
 *  (which rewrites className, not these keys) can't wipe it. */
function land(node: HTMLElement) {
  node.style.transition = "none";
  node.style.opacity = "1";
  node.style.transform = "none";
}

/**
 * Attach `ref` to any element carrying a `.qp-reveal-*` class. Returns
 * `{ ref, className }` — spread `className` onto the same element so `.qp-in`
 * gets appended once it crosses the viewport. Reduced-motion users get the end
 * state immediately (no observer, no transition).
 *
 * const { ref, className } = useReveal();
 * <div ref={ref} className={`qp-reveal-up ${className}`}>...</div>
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  opts: { threshold?: number; once?: boolean } = {},
) {
  const { threshold = 0.2, once = true } = opts;
  const ref = useRef<T | null>(null);
  const reduced = usePrefersReducedMotion();
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (reduced) {
      setInView(true);
      // globals.css only hard-collapses the older `.qp-reveal` under
      // prefers-reduced-motion, not this `.qp-reveal-*` family — so land the
      // end state here instead of animating a 560ms entrance anyway.
      if (node) land(node);
      return;
    }
    if (!node) return;
    let landedBy: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
          // A reveal must never be able to leave content permanently invisible.
          // These elements start at opacity 0 and only the CSS transition
          // brings them back, and WebKit pins a transition that starts while
          // the document's animation timeline is suspended (background tab,
          // occluded window, Low Power Mode) at its from-value forever —
          // playState "running", currentTime 0, startTime null — so `.qp-in`
          // alone can sit at opacity 0 indefinitely. If the reveal hasn't
          // landed by the time it should have, show the content outright.
          landedBy = window.setTimeout(() => {
            if (getComputedStyle(node).opacity !== "1") land(node);
          }, REVEAL_LANDED_BY_MS);
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearTimeout(landedBy);
    };
  }, [reduced, threshold, once]);

  return { ref, className: inView ? "qp-in" : "" };
}

/** Delay-class lookup for stagger sequences — index 0-5 maps to qp-delay-1..6
 *  (70ms/step). Clamps beyond 6 to the max step instead of emitting nothing. */
export function staggerDelay(index: number): string {
  const step = Math.min(Math.max(index + 1, 1), 6);
  return `qp-delay-${step}`;
}
