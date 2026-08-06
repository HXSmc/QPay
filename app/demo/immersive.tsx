"use client";

// Shared scroll-reveal primitive for the immersive demo surfaces (landing,
// /demo/customer, /demo/admin, /demo/branch). One IntersectionObserver-backed
// hook instead of four builders each hand-rolling their own — see
// app/demo/DIRECTION.md "Motion vocabulary" for which qp-reveal-* class to
// pair this with per section.

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

/**
 * Attach `ref` to any element carrying a `.qp-reveal-*` class. Returns
 * `{ ref, className }` — spread `className` onto the same element so `.qp-in`
 * gets appended once it crosses the viewport. Reduced-motion users get
 * `.qp-in` immediately (no observer needed; CSS also hard-collapses the
 * transition, this just skips the delay on top of that).
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
    if (reduced) {
      setInView(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced, threshold, once]);

  return { ref, className: inView ? "qp-in" : "" };
}

/** Delay-class lookup for stagger sequences — index 0-5 maps to qp-delay-1..6
 *  (70ms/step). Clamps beyond 6 to the max step instead of emitting nothing. */
export function staggerDelay(index: number): string {
  const step = Math.min(Math.max(index + 1, 1), 6);
  return `qp-delay-${step}`;
}
