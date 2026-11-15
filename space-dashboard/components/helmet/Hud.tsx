"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { BASELINE, zScore, type MetricKey, type Status } from "@/lib/engine";
import type { SuitReading } from "@/lib/suit";
import { STATUS_COLOR, STATUS_LABEL } from "@/components/astro/ui";

export const HUD = "#7FE3FF";
const zStatus = (z: number): Status => (z > 3 ? "alert" : z > 2 ? "watch" : "nominal");
const colorOf = (s: Status) => (s === "nominal" ? HUD : STATUS_COLOR[s]);

/* ───────── Frame for a block of HUD symbology ───────── */
export function HudBlock({
  code,
  title,
  right,
  children,
  delay = 0,
  className = "",
  status = "nominal",
}: {
  code: string;
  title: string;
  right?: ReactNode;
  children: ReactNode;
  delay?: number;
  className?: string;
  status?: Status;
}) {
  return (
    <section className={`hud-block hud-in ${status !== "nominal" ? `hud-block-${status}` : ""} ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--hud)]">
          <span className="text-[var(--hud-dim)]">{code}</span>
          {title}
        </h2>
        {right}
      </header>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/* ───────── ECG sweep ───────── */
function pqrst(ph: number) {
  const g = (c: number, w: number, a: number) => a * Math.exp(-((ph - c) ** 2) / (2 * w * w));
  return g(0.12, 0.025, 0.12) + g(0.215, 0.009, -0.14) + g(0.24, 0.011, 1) + g(0.265, 0.011, -0.28) + g(0.47, 0.045, 0.3);
}

export function Ecg({ hr, status, height = 54 }: { hr: number; status: Status; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hrRef = useRef(hr);
  const colRef = useRef(colorOf(status));
  useEffect(() => {
    hrRef.current = hr;
    colRef.current = colorOf(status);
  }, [hr, status]);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let ys: number[] = [];
    const resize = () => {
      W = Math.max(10, Math.round(c.clientWidth));
      c.width = W * dpr;
      c.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ys = new Array(W).fill(0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    let x = 0;
    let beat = 0;
    let prev = performance.now();
    let raf = 0;
    const SPEED = 95; // px per second
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const steps = reduce ? 0 : Math.round(SPEED * dt);
      for (let i = 0; i < steps; i++) {
        beat += 1 / SPEED / (60 / Math.max(30, hrRef.current));
        if (beat >= 1) beat -= 1;
        x = (x + 1) % W;
        ys[x] = pqrst(beat) + (Math.random() - 0.5) * 0.025;
      }
      ctx.clearRect(0, 0, W, height);
      // grid
      ctx.strokeStyle = "rgba(127,227,255,0.07)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 12) {
        ctx.beginPath();
        ctx.moveTo(gx + 0.5, 0);
        ctx.lineTo(gx + 0.5, height);
        ctx.stroke();
      }
      const base = height * 0.68;
      const amp = height * 0.6;
      const col = colRef.current;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < W; i++) {
        const gap = (i - x + W) % W;
        if (gap > 0 && gap < 18) {
          pen = false;
          continue;
        }
        const yy = base - ys[i] * amp;
        if (!pen) ctx.moveTo(i, yy);
        else ctx.lineTo(i, yy);
        pen = true;
      }
      ctx.stroke();
      // sweep head
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x, base - ys[x] * amp, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [height]);

  return <canvas ref={ref} className="block w-full" style={{ height }} aria-hidden />;
}

/* ───────── Risk ring ───────── */
export function RiskRing({ score, status, onOpen }: { score: number; status: Status; onOpen: () => void }) {
  const c = colorOf(status);
  const R = 42;
  const len = 2 * Math.PI * R * 0.75;
  return (
    <button type="button" onClick={onOpen} className="hud-hit group flex w-full items-center gap-4 text-left" aria-label={`Crew risk ${score} of 100, ${STATUS_LABEL[status]}. Open risk analysis`}>
      <svg viewBox="0 0 100 100" className="h-[92px] w-[92px] shrink-0 overflow-visible" aria-hidden>
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(127,227,255,0.12)" strokeWidth="6" strokeDasharray={`${len} 999`} transform="rotate(135 50 50)" strokeLinecap="round" />
        {[45, 75].map((t) => {
          const a = ((135 + 270 * (t / 100)) * Math.PI) / 180;
          return <line key={t} x1={50 + 35 * Math.cos(a)} y1={50 + 35 * Math.sin(a)} x2={50 + 49 * Math.cos(a)} y2={50 + 49 * Math.sin(a)} stroke="rgba(127,227,255,0.45)" strokeWidth="1.2" />;
        })}
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={c}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${len} 999`}
          strokeDashoffset={len * (1 - score / 100)}
          transform="rotate(135 50 50)"
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1), stroke .4s", filter: `drop-shadow(0 0 5px ${c})` }}
        />
        <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(127,227,255,0.18)" strokeDasharray="1 3" className="hud-spin-slow" />
        <text x="50" y="55" textAnchor="middle" fontSize="24" fontWeight="700" fill={c} fontFamily="var(--font-space-grotesk)" style={{ filter: `drop-shadow(0 0 6px ${c})` }}>
          {score}
        </text>
        <text x="50" y="68" textAnchor="middle" fontSize="6.5" letterSpacing="1.5" fill="rgba(127,227,255,0.6)" fontFamily="var(--font-geist-mono)">
          RISK
        </text>
      </svg>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--hud-dim)]">Crew risk</p>
        <p className="mt-0.5 font-display text-xl font-semibold uppercase tracking-[0.12em]" style={{ color: c, textShadow: `0 0 12px ${c}` }}>
          {STATUS_LABEL[status]}
        </p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--hud-dim)] transition-colors group-hover:text-[var(--hud)]">▸ Why this score</p>
      </div>
    </button>
  );
}

/* ───────── Biomarker row with baseline band ───────── */
export function BioRow({ k, label, value, digits, onOpen }: { k: MetricKey; label: string; value: number; digits: number; onOpen?: () => void }) {
  const b = BASELINE[k];
  const z = zScore(k, value);
  const st = zStatus(z);
  const c = colorOf(st);
  // scale: mean-3σ … mean+5σ
  const lo = b.mean - 3 * b.std;
  const hi = b.mean + 5 * b.std;
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
  return (
    <button type="button" onClick={onOpen} className="hud-hit group block w-full text-left" aria-label={`${b.label} ${value.toFixed(digits)} ${b.unit}, ${STATUS_LABEL[st]}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--hud-dim)] group-hover:text-[var(--hud)]">{label}</span>
        <span className="font-mono text-[15px] font-semibold tabular-nums" style={{ color: c, textShadow: `0 0 8px ${c}99` }}>
          {value.toFixed(digits)}
          <span className="ml-1 text-[9px] font-normal text-[var(--hud-dim)]">{b.unit}</span>
        </span>
      </div>
      <div className="relative mt-1 h-[5px]" aria-hidden>
        <div className="absolute inset-0 bg-[rgba(127,227,255,0.08)]" />
        <div className="absolute inset-y-0 bg-[rgba(94,224,193,0.22)]" style={{ left: `${pos(b.mean - 2 * b.std)}%`, right: `${100 - pos(b.mean + 2 * b.std)}%` }} />
        <div className="absolute top-1/2 h-[11px] w-[3px] -translate-y-1/2 transition-[left] duration-700" style={{ left: `calc(${pos(value)}% - 1.5px)`, background: c, boxShadow: `0 0 8px ${c}` }} />
      </div>
      <div className="mt-0.5 flex justify-between font-mono text-[8.5px] uppercase tracking-[0.18em] text-[var(--hud-dim)]">
        <span>base {b.mean}±{b.std}</span>
        <span style={{ color: st === "nominal" ? undefined : c }}>
          z {z >= 0 ? "+" : ""}
          {z.toFixed(1)}σ
        </span>
      </div>
    </button>
  );
}

/* ───────── Life-support segmented gauge ───────── */
export function SuitRow({ r }: { r: SuitReading }) {
  const c = colorOf(r.status);
  const SEG = 16;
  const lit = Math.round(r.fill * SEG);
  return (
    <div className="flex items-center gap-3" title={r.label}>
      <span className="w-11 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--hud-dim)]">{r.short}</span>
      <div className="flex flex-1 gap-[2px]" aria-hidden>
        {Array.from({ length: SEG }, (_, i) => (
          <span
            key={i}
            className="h-[9px] flex-1 skew-x-[-18deg] transition-colors duration-500"
            style={{ background: i < lit ? c : "rgba(127,227,255,0.09)", boxShadow: i < lit ? `0 0 6px ${c}88` : undefined, opacity: i < lit ? 0.55 + (i / SEG) * 0.45 : 1 }}
          />
        ))}
      </div>
      <span className="w-[74px] shrink-0 text-right font-mono text-[13px] font-semibold tabular-nums" style={{ color: c, textShadow: `0 0 8px ${c}88` }}>
        {r.value.toFixed(r.digits)}
        <span className="ml-0.5 text-[9px] font-normal text-[var(--hud-dim)]">{r.unit}</span>
      </span>
      <span className="sr-only">
        {r.label} {r.value.toFixed(r.digits)} {r.unit}, {STATUS_LABEL[r.status]}
      </span>
    </div>
  );
}

/* ───────── Dosimeter histogram ───────── */
export function Dosimeter({ series, value, sunEvent }: { series: number[]; value: number; sunEvent: boolean }) {
  const b = BASELINE.dose;
  const st = zStatus(zScore("dose", value));
  const c = colorOf(st);
  const data = series.slice(-36);
  const max = Math.max(b.mean + 3 * b.std, ...data);
  return (
    <div>
      <div className="flex items-end justify-between">
        <p className="font-mono text-[26px] font-semibold leading-none tabular-nums" style={{ color: c, textShadow: `0 0 12px ${c}` }}>
          {value.toFixed(1)}
          <span className="ml-1 text-[10px] font-normal text-[var(--hud-dim)]">µGy/h</span>
        </p>
        <span className={`font-mono text-[9px] uppercase tracking-[0.22em] ${sunEvent ? "hud-blink text-[#FFB454]" : "text-[var(--hud-dim)]"}`}>{sunEvent ? "☢ SPE in progress" : "GCR background"}</span>
      </div>
      <div className="mt-2 flex h-[34px] items-end gap-[2px]" aria-hidden>
        {data.map((v, i) => {
          const s = zStatus(zScore("dose", v));
          return <span key={i} className="flex-1 transition-[height] duration-500" style={{ height: `${Math.max(6, (v / max) * 100)}%`, background: colorOf(s), opacity: 0.25 + (i / data.length) * 0.75 }} />;
        })}
      </div>
    </div>
  );
}

/* ───────── Heading tape (moves with the head) ───────── */
export function HeadingTape() {
  const ticks = Array.from({ length: 73 }, (_, i) => i * 5);
  return (
    <div className="heading-tape relative h-7 overflow-hidden" aria-hidden>
      <div className="heading-strip absolute top-0 flex h-full">
        {ticks.map((d) => (
          <div key={d} className="relative w-[14px] shrink-0">
            <span className={`absolute left-0 top-0 w-px bg-[var(--hud)] ${d % 15 === 0 ? "h-2.5 opacity-80" : "h-1.5 opacity-40"}`} />
            {d % 15 === 0 && (
              <span className="absolute left-0 top-3 -translate-x-1/2 font-mono text-[8.5px] text-[var(--hud-dim)]">{d % 90 === 0 ? ["N", "E", "S", "W"][(d / 90) % 4] : String(d % 360).padStart(3, "0")}</span>
            )}
          </div>
        ))}
      </div>
      <span className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-[var(--hud)]" />
    </div>
  );
}

/* ───────── Centre reticle with pitch ladder ───────── */
export function Reticle({ status }: { status: Status }) {
  const c = colorOf(status);
  return (
    <div className="reticle pointer-events-none" aria-hidden style={{ ["--rc" as string]: c } as CSSProperties}>
      <svg viewBox="-60 -60 120 120" className="h-[120px] w-[120px] overflow-visible">
        <g className="hud-spin-slow" style={{ transformOrigin: "0 0" }}>
          <circle r="34" fill="none" stroke={c} strokeOpacity="0.35" strokeDasharray="2 6" />
        </g>
        <circle r="22" fill="none" stroke={c} strokeOpacity="0.55" strokeWidth="1" strokeDasharray="30 4.5" />
        <circle r="1.6" fill={c} />
        {[0, 90, 180, 270].map((a) => (
          <line key={a} x1="27" x2="40" y1="0" y2="0" stroke={c} strokeOpacity="0.8" strokeWidth="1.2" transform={`rotate(${a})`} />
        ))}
      </svg>
      <div className="pitch-ladder" />
    </div>
  );
}

/* ───────── Bottom dock ───────── */
export type ModuleKey = "twin" | "risk" | "link" | "forecast" | "checklist" | "copilot" | "log";
export const MODULES: { key: ModuleKey; label: string; hint: string }[] = [
  { key: "twin", label: "Twin", hint: "1" },
  { key: "risk", label: "Risk", hint: "2" },
  { key: "link", label: "Link", hint: "3" },
  { key: "forecast", label: "Forecast", hint: "4" },
  { key: "checklist", label: "Checklist", hint: "5" },
  { key: "copilot", label: "Copilot", hint: "6" },
  { key: "log", label: "Log", hint: "7" },
];

export function Dock({ active, onPick, badges }: { active: ModuleKey | null; onPick: (k: ModuleKey) => void; badges: Partial<Record<ModuleKey, string>> }) {
  return (
    <nav aria-label="HUD modules" className="hud-in flex flex-wrap items-center justify-center gap-1.5" style={{ animationDelay: "650ms" }}>
      {MODULES.map((m) => {
        const on = active === m.key;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onPick(m.key)}
            aria-pressed={on}
            className={`dock-btn ${on ? "dock-btn-on" : ""}`}
          >
            <span className="font-mono text-[8.5px] text-[var(--hud-dim)]">{m.hint}</span>
            {m.label}
            {badges[m.key] && <span className="dock-badge">{badges[m.key]}</span>}
          </button>
        );
      })}
    </nav>
  );
}

/* ───────── Hologram window for modules ───────── */
export function HoloWindow({ title, code, onClose, children, wide = false }: { title: string; code: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div role="dialog" aria-modal="false" aria-label={title} className={`holo-window ${wide ? "holo-wide" : ""}`}>
      <div className="holo-scan" aria-hidden />
      <header className="flex items-center justify-between gap-3 border-b border-[rgba(127,227,255,0.18)] px-5 py-3">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--hud)]">
          <span className="mr-2 text-[var(--hud-dim)]">{code}</span>
          {title}
        </h2>
        <button type="button" onClick={onClose} className="dock-btn !px-2.5" aria-label="Close module">
          ESC ✕
        </button>
      </header>
      <div className="holo-body">{children}</div>
    </div>
  );
}
