"use client";

import { useEffect, type RefObject } from "react";

/** Smoothed head direction (-1…1). Shared by the CSS layers and the canvas renderers. */
export const look = { x: 0, y: 0, tx: 0, ty: 0, breath: 0 };

/**
 * Drives the first-person "head" motion: the pointer turns the head, with inertia,
 * plus a slow floating drift. Writes --lx / --ly / --br on the given element.
 */
export function useLook(root: RefObject<HTMLElement | null>, breathsPerMin = 14) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onMove = (e: PointerEvent) => {
      look.tx = (e.clientX / window.innerWidth) * 2 - 1;
      look.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onLeave = () => {
      look.tx = 0;
      look.ty = 0;
    };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);

    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      const driftX = reduce ? 0 : Math.sin(t * 0.11) * 0.18 + Math.sin(t * 0.037) * 0.12;
      const driftY = reduce ? 0 : Math.cos(t * 0.09) * 0.12;
      const k = reduce ? 1 : 0.045; // inertia
      look.x += (look.tx * (reduce ? 0 : 1) + driftX - look.x) * k;
      look.y += (look.ty * (reduce ? 0 : 1) + driftY - look.y) * k;
      // Breathing phase 0…1…0 (inhale is a bit shorter than exhale).
      const period = 60 / breathsPerMin;
      const ph = (t % period) / period;
      look.breath = ph < 0.4 ? Math.sin((ph / 0.4) * (Math.PI / 2)) : Math.cos(((ph - 0.4) / 0.6) * (Math.PI / 2));
      el.style.setProperty("--lx", look.x.toFixed(4));
      el.style.setProperty("--ly", look.y.toFixed(4));
      el.style.setProperty("--br", (reduce ? 0.3 : look.breath).toFixed(3));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [root, breathsPerMin]);
}
