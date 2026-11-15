"use client";

import { useEffect, useState } from "react";
import { blip, chord, hiss } from "@/components/astro/audio";

const LINES = [
  "HELMET SEAL ............ LOCKED",
  "SUIT PRESSURE .......... 4.30 PSI",
  "O₂ FLOW ................ NOMINAL",
  "CO₂ SCRUBBER ........... ACTIVE",
  "BIOMED HARNESS CM-3 .... LINKED",
  "ASTROSENTINEL ENGINE ... ONLINE",
  "HUD PROJECTION ......... GO",
];

/** Helmet power-on: the visor irises open while systems report in. Click or any key skips it. */
export default function Boot({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = reduce ? 60 : 230;
    hiss();
    const timers: ReturnType<typeof setTimeout>[] = [];
    LINES.forEach((_, i) =>
      timers.push(
        setTimeout(() => {
          setN(i + 1);
          blip(1200 + i * 90, 0.018, 0.04);
        }, 350 + i * step),
      ),
    );
    const end = 350 + LINES.length * step + 350;
    timers.push(setTimeout(() => {
      setLeaving(true);
      chord([660, 990, 1320], 0.02, 0.18);
    }, end));
    timers.push(setTimeout(onDone, end + 900));
    const skip = () => {
      timers.forEach(clearTimeout);
      setLeaving(true);
      setTimeout(onDone, 500);
    };
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [onDone]);

  return (
    <div className={`boot ${leaving ? "boot-out" : ""}`} role="status" aria-label="Helmet systems starting">
      <div className="boot-iris" aria-hidden />
      <div className="relative z-10 w-[min(440px,86vw)] font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--hud)]">
        <p className="mb-4 text-[10px] tracking-[0.45em] text-[var(--hud-dim)]">AstroSentinel · EVA helmet power-on</p>
        <ol className="space-y-1.5">
          {LINES.slice(0, n).map((l, i) => (
            <li key={l} className="boot-line" style={{ color: i === LINES.length - 1 ? "#5EE0C1" : undefined }}>
              {l}
            </li>
          ))}
        </ol>
        <div className="mt-5 h-[2px] w-full bg-[rgba(127,227,255,0.12)]">
          <div className="h-full bg-[var(--hud)] shadow-[0_0_10px_var(--hud)] transition-[width] duration-300" style={{ width: `${(n / LINES.length) * 100}%` }} />
        </div>
        <p className="mt-3 text-[9px] tracking-[0.3em] text-[var(--hud-dim)]">Click or press any key to skip</p>
      </div>
    </div>
  );
}
