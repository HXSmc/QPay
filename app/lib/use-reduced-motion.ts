"use client";

import { useEffect, useState } from "react";

/**
 * True when the user prefers reduced motion. Single shared implementation —
 * previously copy-pasted into CustomerView, MenuModal, OrderModal, and inlined
 * in MarketingView. Gate any non-essential animation on this and degrade to an
 * instant/static state when it returns true.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}
