"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Status } from "@/lib/engine";
import type { crewSnapshot } from "@/lib/store";

export type CrewSnap = ReturnType<typeof crewSnapshot>;

export const STATUS_COLOR: Record<Status, string> = { nominal: "#5EE0C1", watch: "#FFB454", alert: "#FF7A7A" };
export const STATUS_LABEL: Record<Status, string> = { nominal: "Nominal", watch: "Watch", alert: "Alert" };

export const simClock = (ts: number) => new Date(ts).toISOString().slice(11, 16);

export const GLOW: Record<Status, string> = { nominal: "glow-nominal", watch: "glow-watch", alert: "glow-alert" };

export function Panel({
  title,
  right,
  children,
  className = "",
  status,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  status?: Status;
}) {
  return (
    <section className={`print-panel glass relative rounded-2xl p-5 ${status ? GLOW[status] : ""} ${className}`}>
      <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-3 w-3 rounded-tl-2xl border-l border-t border-accent/60" />
      <span aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 rounded-br-2xl border-b border-r border-accent/60" />
      {(title || right) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              <span aria-hidden className="h-3 w-0.5 rounded-full bg-accent shadow-[0_0_8px_rgba(76,201,240,0.9)]" />
              {title}
            </h2>
          )}
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatusChip({ status, size = "sm" }: { status: Status; size?: "sm" | "lg" }) {
  const c = STATUS_COLOR[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-semibold uppercase tracking-[0.18em] ${size === "lg" ? "px-4 py-1.5 text-sm" : "px-2.5 py-0.5 text-[10px]"} ${status === "alert" ? "animate-pulse" : ""}`}
      style={{ color: c, background: `${c}1f`, boxShadow: `inset 0 0 0 1px ${c}88, 0 0 ${size === "lg" ? 18 : 10}px ${c}55` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Chip({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const t = tone ?? "#4CC9F0";
  return (
    <div
      className="glass flex items-center gap-2 rounded-lg px-3 py-1.5"
      style={tone ? { borderColor: `${t}88`, boxShadow: `0 0 14px ${t}40` } : undefined}
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">{label}</span>
      <span className="font-mono text-xs font-medium" style={{ color: tone ?? "#E6EDF7", textShadow: tone ? `0 0 8px ${t}` : undefined }}>
        {value}
      </span>
    </div>
  );
}

export function Sparkline({ values, color = "#4CC9F0", height = 36, band }: { values: number[]; color?: string; height?: number; band?: [number, number] }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (values.length < 2) return <div style={{ height }} />;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (band) {
    min = Math.min(min, band[0]);
    max = Math.max(max, band[1]);
  }
  const span = max - min || 1;
  const y = (v: number) => 28 - ((v - min) / span) * 24;
  const d = values.map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * 100).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className="spark-glow block w-full overflow-visible"
      style={{ height, ["--spark" as string]: color }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`sp${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.45} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {band && <rect x="0" width="100" y={y(band[1])} height={Math.max(0, y(band[0]) - y(band[1]))} fill="#9AABC4" opacity={0.08} />}
      <path d={`${d} L100 30 L0 30 Z`} fill={`url(#sp${uid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.8} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function DemoLabel() {
  return <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted/80">Demo build · synthetic data calibrated on NASA open-data ranges</p>;
}

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="relative grid place-items-center rounded-xl bg-accent/10 ring-1 ring-accent/50 shadow-[0_0_20px_rgba(76,201,240,0.45)]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2 text-accent drop-shadow-[0_0_6px_rgba(76,201,240,0.9)]" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        <path d="M8 12h2l1.5-3 2 6 1.5-3h1" />
      </svg>
    </div>
  );
}

export function TopBar({ view, children }: { view: "crew" | "ground"; children?: ReactNode }) {
  return (
    <header className="print-panel glass glow-nominal flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
      <div className="flex items-center gap-4">
        <Link href="/" aria-label="AstroSentinel home">
          <Logo />
        </Link>
        <div>
          <h1 className="bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-lg font-bold tracking-[0.08em] text-transparent">ASTROSENTINEL</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            {view === "crew" ? "Crew console · on-board · offline-first" : "Ground segment · Mission Control"}
          </p>
        </div>
        <nav className="no-print ml-2 flex gap-1 rounded-xl border border-white/10 bg-black/20 p-1" aria-label="Views">
          {(["crew", "ground"] as const).map((v) => (
            <Link
              key={v}
              href={`/${v}`}
              aria-current={v === view ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-all ${
                v === view ? "bg-accent/15 text-accent shadow-[0_0_14px_rgba(76,201,240,0.35)]" : "text-muted hover:text-ink"
              }`}
            >
              {v === "crew" ? "Crew" : "Ground"}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </header>
  );
}

/* ───────── Scientific explainer tooltips ───────── */

export const SCIENCE = {
  risk: {
    title: "How the risk score works",
    body: "Each biomarker becomes a z-score against this astronaut's own preflight baseline, clipped to 0–4σ and weighted: NDI 40%, dose 25%, IOP 20%, BBB 15%. Personal baselines matter because healthy ranges differ between people, so a value normal for one crew member can be a warning for another.",
  },
  notch: {
    title: "Notch signaling · NDI",
    body: "Notch is a contact-dependent pathway: a ligand on one cell (Jagged or Delta-like) binds a Notch receptor on its neighbour, the receptor is cleaved and switches on target genes. In blood vessels it controls sprouting, arterial identity and keeps mature endothelium quiet and stable. Space radiation and microgravity are studied as stressors of this vascular signaling. The Notch Disruption Index (0–100) is AstroSentinel's composite marker for the axis; values in this demo are synthetic.",
  },
  jag2: {
    title: "Endothelial Jagged-2 (Jag2)",
    body: "Jag2 is one of the Notch ligands expressed by endothelial cells. By activating Notch on neighbouring endothelial and mural cells it helps coordinate vessel maturation and the endothelial–pericyte contact that stabilises capillaries. A shift in Jag2 expression signals an unbalanced Notch axis, which is why the copilot recommends tracking it after radiation exposure.",
  },
  notch4: {
    title: "Notch4 receptor activity",
    body: "Notch4 is a Notch receptor found mainly on vascular endothelium. The pathway has to stay balanced: in mice, constitutively active Notch4 causes arteriovenous malformations. Here, falling Notch4 activity models endothelium losing its stabilising signal.",
  },
  bbb: {
    title: "Blood-brain barrier maintenance",
    body: "Brain capillary endothelial cells, sealed by tight junctions (claudin-5, occludin) and supported by pericytes and astrocyte end-feet, keep blood-borne molecules out of neural tissue. Endothelial–pericyte Notch signaling contributes to keeping this barrier tight. Ionising radiation raises BBB permeability in animal studies, letting inflammatory molecules reach the brain. Shown as × preflight baseline.",
  },
  iop: {
    title: "Intraocular pressure & SANS",
    body: "Microgravity shifts body fluids toward the head. Many long-duration crew develop Spaceflight-Associated Neuro-ocular Syndrome (SANS): optic disc swelling, globe flattening and choroidal folds. IOP is a quick on-board proxy watched alongside OCT imaging.",
  },
  hr: {
    title: "Heart rate",
    body: "Resting heart rate reflects cardiovascular deconditioning and acute stress. It is displayed for context but not weighted in the risk score, because it moves with exercise and workload.",
  },
  dose: {
    title: "Radiation dose rate",
    body: "Galactic cosmic rays give a steady background; a solar particle event can raise the dose rate by orders of magnitude for hours. Dose is a driver, not a symptom: it enters the score so the crew can shelter before biomarkers move.",
  },
} as const;

export type ScienceKey = keyof typeof SCIENCE;

export function SciTip({ k, side = "right" }: { k: ScienceKey; side?: "left" | "right" }) {
  const s = SCIENCE[k];
  const id = useId();
  return (
    <span className="group/tip relative inline-flex align-middle">
      <button
        type="button"
        aria-describedby={id}
        aria-label={`About ${s.title}`}
        className="grid h-4 w-4 place-items-center rounded-full border border-accent/40 font-mono text-[9px] font-bold text-accent/80 transition-all hover:scale-110 hover:border-accent hover:text-accent hover:shadow-[0_0_10px_rgba(76,201,240,0.6)] focus-visible:border-accent"
      >
        i
      </button>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none invisible absolute top-full z-[60] mt-2 w-80 translate-y-1 rounded-xl border border-accent/30 bg-[#070c16]/95 p-4 text-left normal-case tracking-normal opacity-0 shadow-[0_0_30px_rgba(76,201,240,0.25),0_20px_40px_-10px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all duration-200 group-hover/tip:visible group-hover/tip:translate-y-0 group-hover/tip:opacity-100 group-focus-within/tip:visible group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100 ${
          side === "left" ? "right-0" : "left-0"
        }`}
      >
        <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">{s.title}</span>
        <span className="mt-1.5 block font-sans text-[12px] font-normal leading-relaxed text-ink/90">{s.body}</span>
      </span>
    </span>
  );
}

/** Live crew state over SSE, auto-reconnecting. */
export function useCrewStream() {
  const [snap, setSnap] = useState<CrewSnap | null>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout>;
    const open = () => {
      es = new EventSource("/api/stream");
      es.onopen = () => setConnected(true);
      es.onmessage = (e) => setSnap(JSON.parse(e.data));
      es.onerror = () => {
        setConnected(false);
        es?.close();
        retry = setTimeout(open, 1500);
      };
    };
    open();
    return () => {
      clearTimeout(retry);
      es?.close();
    };
  }, []);
  return { snap, connected, setSnap };
}

export function usePoll<T>(url: string, ms = 1000) {
  const [data, setData] = useState<T | null>(null);
  const urlRef = useRef(url);
  urlRef.current = url;
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(urlRef.current, { cache: "no-store" });
        if (alive && r.ok) setData(await r.json());
      } catch {}
    };
    load();
    const id = setInterval(load, ms);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [url, ms]);
  return data;
}

export async function post<T = unknown>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
