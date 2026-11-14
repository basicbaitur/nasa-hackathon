"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { blip, chord, klaxon, unlockAudio } from "@/components/astro/audio";

/* ───────── Shared overlay shell ───────── */

function Overlay({ label, children, onCancel, tone = "accent" }: { label: string; children: React.ReactNode; onCancel: () => void; tone?: "accent" | "alert" | "nominal" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  const ring = tone === "alert" ? "glow-alert" : tone === "nominal" ? "shadow-[0_0_40px_rgba(94,224,193,0.45)] border-nominal/60" : "glow-nominal";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-md">
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} className={`glass ${ring} relative w-full max-w-md rounded-3xl p-7 outline-none animate-[zoom-in_.2s_ease-out]`}>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel authentication"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-muted transition-colors hover:border-accent/60 hover:text-accent"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

/* ───────── Biometric face scan (simulated: no camera is accessed) ───────── */

const SCAN_LOG = [
  "Initialising optical array",
  "Acquiring facial mesh · 68 landmarks",
  "Liveness check · micro-saccade OK",
  "Matching crew registry",
  "Identity: CM-3 Eng. Lindqvist · 99.7%",
];

export function FaceScan({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [pct, setPct] = useState(0);
  const [granted, setGranted] = useState(false);
  const points = useMemo(() => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push([100 + Math.cos(a) * 52, 108 + Math.sin(a) * 68]);
    }
    const inner: [number, number][] = [
      [78, 92], [86, 88], [94, 92], [106, 92], [114, 88], [122, 92], // brows/eyes
      [80, 102], [90, 104], [110, 104], [120, 102],
      [100, 100], [100, 116], [94, 126], [106, 126], // nose
      [84, 142], [92, 146], [100, 148], [108, 146], [116, 142], // mouth
      [70, 120], [130, 120], [100, 160],
    ];
    return [...pts, ...inner];
  }, []);

  useEffect(() => {
    unlockAudio();
    const start = performance.now();
    const dur = 3200;
    let raf = 0;
    let lastBeep = 0;
    const loop = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setPct(p);
      if (t - lastBeep > 260) {
        blip(900 + p * 900, 0.012, 0.03);
        lastBeep = t;
      }
      if (p < 1) raf = requestAnimationFrame(loop);
      else {
        setGranted(true);
        chord([660, 880, 1320], 0.04, 0.35);
        setTimeout(onDone, 1100);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  const shown = Math.floor(pct * points.length);
  const logN = Math.min(SCAN_LOG.length, Math.floor(pct * SCAN_LOG.length) + 1);

  return (
    <Overlay label="Biometric face scan" onCancel={onCancel} tone={granted ? "nominal" : "accent"}>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Crew access · biometric</p>
      <h2 className="mt-1 text-xl font-bold">Face scan</h2>

      <div className="relative mx-auto mt-5 aspect-square w-64 overflow-hidden rounded-2xl border border-accent/30 bg-black/50">
        {/* viewfinder corners */}
        {["left-2 top-2 border-l-2 border-t-2", "right-2 top-2 border-r-2 border-t-2", "left-2 bottom-2 border-l-2 border-b-2", "right-2 bottom-2 border-r-2 border-b-2"].map((c) => (
          <span key={c} aria-hidden className={`absolute h-6 w-6 ${c} ${granted ? "border-nominal" : "border-accent"}`} />
        ))}
        <svg viewBox="0 0 200 220" className="absolute inset-0 h-full w-full" aria-hidden>
          <ellipse cx="100" cy="108" rx="52" ry="68" fill="none" stroke={granted ? "#5EE0C1" : "#4CC9F0"} strokeOpacity={0.35} strokeDasharray="3 4" />
          {points.slice(0, shown).map(([x, y], i) => {
            const [nx, ny] = points[(i + 7) % points.length];
            return (
              <g key={i}>
                {i % 2 === 0 && i + 7 < shown && <line x1={x} y1={y} x2={nx} y2={ny} stroke="#4CC9F0" strokeOpacity={0.25} strokeWidth={0.6} />}
                <circle cx={x} cy={y} r={1.8} fill={granted ? "#5EE0C1" : "#4CC9F0"} style={{ filter: `drop-shadow(0 0 3px ${granted ? "#5EE0C1" : "#4CC9F0"})` }} />
              </g>
            );
          })}
        </svg>
        {!granted && <div className="scan-line" aria-hidden />}
        {granted && (
          <div className="absolute inset-0 grid place-items-center bg-nominal/10">
            <p className="rounded-lg border border-nominal/70 bg-black/60 px-4 py-2 font-mono text-lg font-bold uppercase tracking-[0.3em] text-nominal shadow-[0_0_30px_rgba(94,224,193,0.6)]">
              Access granted
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className={`h-full rounded-full ${granted ? "bg-nominal" : "bg-gradient-to-r from-cyan-400 to-blue-600"} shadow-[0_0_12px_rgba(76,201,240,0.8)]`} style={{ width: `${pct * 100}%` }} />
      </div>
      <ol className="mt-4 space-y-1 font-mono text-[11px]" aria-live="polite">
        {SCAN_LOG.slice(0, logN).map((l, i) => (
          <li key={l} className={i === logN - 1 && !granted ? "text-accent" : "text-muted"}>
            <span className="text-nominal">{i < logN - 1 || granted ? "✓" : "›"}</span> {l}
            {i === logN - 1 && !granted && <span className="cursor-blink">_</span>}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[10px] text-muted/70">Simulated for the demo. No camera is accessed.</p>
    </Overlay>
  );
}

/* ───────── Ground clearance PIN + decryption effect ───────── */

const PIN = "1969";
const HEX = "0123456789ABCDEF#$%&@*";
const TARGETS = ["HANDSHAKE · DSN-43 CANBERRA", "AES-256 KEY EXCHANGE · OK", "CLEARANCE LEVEL 5 · FLIGHT SURGEON", "MISSION CONTROL · ACCESS GRANTED"];

function Decrypt({ onDone }: { onDone: () => void }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const p = Math.min(1, (now - start) / 2200);
      setT(p);
      if (p < 1) raf = requestAnimationFrame(loop);
      else setTimeout(onDone, 700);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);
  return (
    <div className="mt-5 space-y-2 font-mono text-xs" aria-live="polite">
      {TARGETS.map((target, li) => {
        const lp = Math.max(0, Math.min(1, t * TARGETS.length - li * 0.7));
        const solved = Math.floor(lp * target.length);
        const txt = target
          .split("")
          .map((ch, i) => (i < solved || ch === " " ? ch : HEX[Math.floor(Math.random() * HEX.length)]))
          .join("");
        const done = lp >= 1;
        return (
          <p key={target} className={done ? (li === TARGETS.length - 1 ? "text-nominal neon-text" : "text-accent") : "text-muted/70"}>
            <span className="text-muted">[{done ? " OK " : `${String(Math.floor(lp * 100)).padStart(3, "0")}%`}]</span> {lp > 0 ? txt : "…"}
          </p>
        );
      })}
    </div>
  );
}

export function PinPad({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [pin, setPin] = useState("");
  const [state, setState] = useState<"idle" | "denied" | "decrypt">("idle");

  const press = useCallback(
    (d: string) => {
      if (state === "decrypt") return;
      unlockAudio();
      blip(1200 + Number(d) * 60, 0.025);
      setState("idle");
      setPin((p) => (p.length >= 4 ? p : p + d));
    },
    [state],
  );
  const back = useCallback(() => setPin((p) => p.slice(0, -1)), []);

  useEffect(() => {
    if (pin.length !== 4) return;
    if (pin === PIN) {
      chord([523, 784, 1046], 0.035, 0.25);
      setState("decrypt");
    } else {
      klaxon(0.45, 0.05);
      setState("denied");
      setTimeout(() => setPin(""), 500);
    }
  }, [pin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, back]);

  return (
    <Overlay label="Ground clearance PIN" onCancel={onCancel} tone={state === "denied" ? "alert" : state === "decrypt" ? "nominal" : "accent"}>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Ground segment · restricted</p>
      <h2 className="mt-1 text-xl font-bold">Enter clearance code</h2>

      <div className={`mt-6 flex justify-center gap-3 ${state === "denied" ? "animate-[shake_.4s_ease-in-out]" : ""}`} aria-label={`${pin.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => {
          const filled = i < pin.length;
          const c = state === "denied" ? "#FF7A7A" : state === "decrypt" ? "#5EE0C1" : "#4CC9F0";
          return (
            <span
              key={i}
              className="grid h-14 w-12 place-items-center rounded-xl border font-mono text-2xl"
              style={{ borderColor: filled ? c : "rgba(255,255,255,0.12)", color: c, boxShadow: filled ? `0 0 16px ${c}66` : undefined }}
            >
              {filled ? "●" : ""}
            </span>
          );
        })}
      </div>
      <p className={`mt-3 h-4 text-center font-mono text-[11px] uppercase tracking-[0.25em] ${state === "denied" ? "text-alert" : "text-muted"}`} role="status">
        {state === "denied" ? "Access denied · invalid code" : state === "decrypt" ? "Decrypting secure channel" : "4-digit code"}
      </p>

      {state === "decrypt" ? (
        <Decrypt onDone={onDone} />
      ) : (
        <div className="mx-auto mt-5 grid max-w-[260px] grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => press(d)}
              className="launch-btn h-14 rounded-xl border border-white/10 bg-white/[0.03] font-mono text-xl transition-all hover:scale-105 hover:border-accent/60 hover:text-accent hover:shadow-[0_0_16px_rgba(76,201,240,0.4)] active:scale-95"
            >
              {d}
            </button>
          ))}
          <button type="button" onClick={back} aria-label="Delete last digit" className="h-14 rounded-xl border border-white/10 font-mono text-sm text-muted transition-all hover:border-watch/60 hover:text-watch">
            ⌫
          </button>
          <button
            type="button"
            onClick={() => press("0")}
            className="launch-btn h-14 rounded-xl border border-white/10 bg-white/[0.03] font-mono text-xl transition-all hover:scale-105 hover:border-accent/60 hover:text-accent hover:shadow-[0_0_16px_rgba(76,201,240,0.4)] active:scale-95"
          >
            0
          </button>
          <button type="button" onClick={() => setPin("")} aria-label="Clear code" className="h-14 rounded-xl border border-white/10 font-mono text-[11px] uppercase tracking-[0.15em] text-muted transition-all hover:border-alert/60 hover:text-alert">
            CLR
          </button>
        </div>
      )}
      <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted/70">Demo code: 1969 · Apollo 11</p>
    </Overlay>
  );
}
