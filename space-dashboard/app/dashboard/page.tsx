// app/dashboard/page.tsx (original single-page dashboard)
"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import {
  Activity,
  Brain,
  ChevronRight,
  CircleCheck,
  Clock,
  Dna,
  Droplets,
  Eye,
  Gauge,
  HeartPulse,
  Info,
  Microscope,
  MousePointerClick,
  Orbit,
  Radiation,
  Satellite,
  ShieldAlert,
  Thermometer,
  TriangleAlert,
  Waves,
  Wind,
  X,
  type LucideIcon,
} from "lucide-react";
import AstronautModel, { ZONE_CONFIG, ZONE_ORDER, type Zone, type ZoneStatus } from "@/components/AstronautModel";
import metrics from "@/data/metrics.json";

/* ───────────────────────── Data layer ───────────────────────── */

type Point = (typeof metrics.timeseries)[number];
type MetricKey = Exclude<keyof Point, "t">;
type Threshold = { watch: number; alert: number; direction: string };
type Band = { from: number; to: number; color: string; label: string };

const TS = metrics.timeseries;
const TH = metrics.thresholds;
const BASE = metrics.baseline;
const N = TS.length;
const TIMES = TS.map((p) => p.t);
const LAST = TS[N - 1];
const FIRST = TS[0];
const col = (k: MetricKey): number[] => TS.map((p) => p[k]);

const RANK: Record<ZoneStatus, number> = { nominal: 0, watch: 1, alert: 2 };

function levelOf(v: number, t: Threshold): ZoneStatus {
  if (t.direction === "low") return v <= t.alert ? "alert" : v <= t.watch ? "watch" : "nominal";
  return v >= t.alert ? "alert" : v >= t.watch ? "watch" : "nominal";
}
const worst = (...l: ZoneStatus[]) => l.reduce<ZoneStatus>((a, b) => (RANK[b] > RANK[a] ? b : a), "nominal");

const STATUSES: Record<Zone, ZoneStatus> = {
  head: worst(levelOf(LAST.iop, TH.iop), levelOf(LAST.icp, TH.icp), levelOf(LAST.bbb, TH.bbb)),
  chest: worst(levelOf(LAST.ndi, TH.ndi), levelOf(LAST.fmd, TH.fmd)),
  arm: worst(levelOf(LAST.hr, TH.hr), levelOf(LAST.dose, TH.dose)),
};

const EVENT_COLOR: Record<string, string> = { sleep: "#818cf8", saa: "#f59e0b", exercise: "#34d399" };
const bandsOf = (...types: string[]): Band[] =>
  metrics.events
    .filter((e) => types.includes(e.type))
    .map((e) => {
      const from = Math.max(0, TIMES.indexOf(e.start));
      return { from, to: Math.min(N - 1, from + e.hours), color: EVENT_COLOR[e.type] ?? "#64748b", label: e.label };
    });

const DOSE_24H_UGY = col("dose").reduce((a, b) => a + b, 0);

const fmt = (v: number, d = 1) => v.toFixed(d);
const pct = (cur: number, base: number) => ((cur - base) / base) * 100;
const signed = (v: number, d = 1) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(d)}`;
const hhmm = (iso: string) => iso.slice(11, 16);

/* ───────────────────────── Styling tokens ───────────────────────── */

const STATUS_STYLE: Record<ZoneStatus, { text: string; bg: string; ring: string; dot: string; label: string }> = {
  nominal: { text: "text-emerald-300", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30", dot: "bg-emerald-400", label: "Nominal" },
  watch: { text: "text-amber-300", bg: "bg-amber-500/10", ring: "ring-amber-500/30", dot: "bg-amber-400", label: "Watch" },
  alert: { text: "text-rose-300", bg: "bg-rose-500/10", ring: "ring-rose-500/30", dot: "bg-rose-400", label: "Alert" },
};

const TONE = {
  bad: "text-rose-300",
  warn: "text-amber-300",
  good: "text-emerald-300",
  neutral: "text-slate-200",
} as const;

type OverviewDef = {
  key: MetricKey;
  zone: Zone;
  label: string;
  sub: string;
  unit: string;
  icon: LucideIcon;
  color: string;
  decimals: number;
  th: Threshold;
};

const OVERVIEW: OverviewDef[] = [
  { key: "iop", zone: "head", label: "Intraocular Pressure", sub: "SANS risk · rebound tonometry", unit: "mmHg", icon: Eye, color: "#22d3ee", decimals: 1, th: TH.iop },
  { key: "bbb", zone: "head", label: "BBB Permeability", sub: "Kᴛʀᴀɴs index · rel. preflight", unit: "×", icon: Brain, color: "#a78bfa", decimals: 2, th: TH.bbb },
  { key: "ndi", zone: "chest", label: "Notch Disruption Index", sub: "Jag2–Notch4 endothelial axis", unit: "/100", icon: Dna, color: "#fb7185", decimals: 1, th: TH.ndi },
  { key: "hr", zone: "arm", label: "Heart Rate", sub: "Bio-Monitor · wrist ECG", unit: "bpm", icon: HeartPulse, color: "#fbbf24", decimals: 0, th: TH.hr },
];

const FLAG_DEFS: { key: MetricKey; zone: Zone; label: string; unit: string; d: number; th: Threshold }[] = [
  { key: "iop", zone: "head", label: "Intraocular pressure", unit: "mmHg", d: 1, th: TH.iop },
  { key: "icp", zone: "head", label: "Intracranial pressure (est.)", unit: "mmHg", d: 1, th: TH.icp },
  { key: "bbb", zone: "head", label: "BBB permeability index", unit: "×", d: 2, th: TH.bbb },
  { key: "ndi", zone: "chest", label: "Notch disruption index", unit: "/100", d: 1, th: TH.ndi },
  { key: "fmd", zone: "chest", label: "Flow-mediated dilation", unit: "%", d: 1, th: TH.fmd },
  { key: "hr", zone: "arm", label: "Heart rate", unit: "bpm", d: 0, th: TH.hr },
  { key: "dose", zone: "arm", label: "Dose rate", unit: "µGy/h", d: 1, th: TH.dose },
];

const FLAGS = FLAG_DEFS.map((f) => ({ ...f, value: LAST[f.key], status: levelOf(LAST[f.key], f.th) })).filter(
  (f) => f.status !== "nominal",
);

/* ───────────────────────── Hooks ───────────────────────── */

function useUtcClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString().slice(11, 19));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return now;
}

/* ───────────────────────── Primitives ───────────────────────── */

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-2xl border border-slate-700/50 bg-slate-800/40 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.9)] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: ZoneStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${status !== "nominal" ? "animate-pulse" : ""}`} />
      {s.label}
    </span>
  );
}

function Tip({ text, side = "left" }: { text: string; side?: "left" | "right" }) {
  return (
    <span tabIndex={0} className="group/tip relative inline-flex shrink-0 align-middle outline-none">
      <Info className="h-3.5 w-3.5 cursor-help text-slate-500 transition-colors group-hover/tip:text-cyan-300 group-focus/tip:text-cyan-300" />
      <span
        role="tooltip"
        className={`pointer-events-none invisible absolute bottom-full z-50 mb-2 w-72 translate-y-1 rounded-lg border border-slate-600/60 bg-slate-950/95 p-3 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-slate-300 opacity-0 shadow-2xl shadow-black/60 transition-all duration-150 group-hover/tip:visible group-hover/tip:translate-y-0 group-hover/tip:opacity-100 group-focus/tip:visible group-focus/tip:translate-y-0 group-focus/tip:opacity-100 ${
          side === "left" ? "right-0" : "left-0"
        }`}
      >
        {text}
      </span>
    </span>
  );
}

function Section({ title, icon: Icon, children, right }: { title: string; icon: LucideIcon; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
          <Icon className="h-3.5 w-3.5 text-slate-400" />
          {title}
        </h3>
        {right}
      </header>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  unit,
  sub,
  status,
  tip,
  accent = "#e2e8f0",
}: {
  label: string;
  value: string;
  unit: string;
  sub?: string;
  status?: ZoneStatus;
  tip?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-3 transition-colors hover:border-slate-600/70">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
        {tip && <Tip text={tip} />}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-semibold tabular-nums" style={{ color: accent }}>
          {value}
        </span>
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500">{sub}</span>
        {status && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_STYLE[status].dot}`} title={STATUS_STYLE[status].label} />}
      </div>
    </div>
  );
}

function Row({ label, value, tone = "neutral", tip, sub }: { label: string; value: string; tone?: keyof typeof TONE; tip?: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="flex items-center gap-1.5 text-xs text-slate-400">
        {label}
        {tip && <Tip text={tip} side="right" />}
      </dt>
      <dd className={`text-right font-mono text-xs tabular-nums ${TONE[tone]}`}>
        {value}
        {sub && <span className="ml-1.5 text-[10px] text-slate-500">{sub}</span>}
      </dd>
    </div>
  );
}

function Sparkline({ values, color, height = 36 }: { values: number[]; color: string; height?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = values
    .map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * 100).toFixed(2)} ${(28 - ((v - min) / span) * 24).toFixed(2)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="block w-full" style={{ height }} aria-hidden>
      <defs>
        <linearGradient id={`sp${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${d} L100 30 L0 30 Z`} fill={`url(#sp${uid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

interface TrendSeries {
  label: string;
  color: string;
  values: number[];
  unit: string;
  decimals: number;
  fill?: boolean;
}

function TrendChart({
  series,
  height = 140,
  threshold,
  bands = [],
  domain,
}: {
  series: TrendSeries[];
  height?: number;
  threshold?: { value: number; label: string; color?: string };
  bands?: Band[];
  domain?: [number, number];
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values).concat(threshold ? [threshold.value] : []);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.15 || 1;
  const [min, max] = domain ?? [lo - pad, hi + pad];
  const X = (i: number) => (i / (N - 1)) * 100;
  const Y = (v: number) => Math.max(0, Math.min(100, 100 - ((v - min) / (max - min)) * 100));
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(2)} ${Y(v).toFixed(2)}`).join(" ");
  const idx = hover ?? N - 1;
  const tColor = threshold?.color ?? "#f59e0b";
  const dec = series[0]?.decimals ?? 1;

  return (
    <div>
      <div
        className="relative cursor-crosshair"
        style={{ height }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (N - 1)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <defs>
            {series.map((s, k) => (
              <linearGradient key={k} id={`${uid}g${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {bands.map((b, k) => (
            <rect key={k} x={X(b.from)} y={0} width={Math.max(0.5, X(b.to) - X(b.from))} height={100} fill={b.color} opacity={0.09} />
          ))}
          {[0, 25, 50, 75, 100].map((g) => (
            <line key={g} x1={0} x2={100} y1={g} y2={g} stroke="#334155" strokeWidth={1} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
          ))}
          {threshold && (
            <line
              x1={0}
              x2={100}
              y1={Y(threshold.value)}
              y2={Y(threshold.value)}
              stroke={tColor}
              strokeWidth={1}
              strokeDasharray="5 4"
              strokeOpacity={0.8}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {series.map((s, k) => (
            <g key={s.label}>
              {(s.fill ?? k === 0) && <path d={`${path(s.values)} L100 100 L0 100 Z`} fill={`url(#${uid}g${k})`} />}
              <path
                d={path(s.values)}
                fill="none"
                stroke={s.color}
                strokeWidth={1.8}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          ))}
          {hover !== null && (
            <line x1={X(hover)} x2={X(hover)} y1={0} y2={100} stroke="#e2e8f0" strokeOpacity={0.35} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        <span className="pointer-events-none absolute right-1 top-0.5 font-mono text-[9px] text-slate-500">{max.toFixed(dec)}</span>
        <span className="pointer-events-none absolute bottom-0.5 right-1 font-mono text-[9px] text-slate-500">{min.toFixed(dec)}</span>
        {threshold && (
          <span className="pointer-events-none absolute left-1 mt-0.5 font-mono text-[9px]" style={{ top: `${Y(threshold.value)}%`, color: tColor }}>
            {threshold.label}
          </span>
        )}
        {bands.map((b, k) => (
          <span
            key={k}
            className="pointer-events-none absolute top-0.5 font-mono text-[8px] uppercase tracking-wider"
            style={{ left: `calc(${X(b.from)}% + 3px)`, color: b.color }}
          >
            {b.label}
          </span>
        ))}
        {series.map((s) => (
          <span
            key={s.label}
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-900 transition-[left,top] duration-75"
            style={{ left: `${X(idx)}%`, top: `${Y(s.values[idx])}%`, background: s.color, boxShadow: `0 0 10px ${s.color}` }}
          />
        ))}
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-3 z-20 -translate-x-1/2 rounded-md border border-slate-600/60 bg-slate-950/95 px-2.5 py-1.5 shadow-xl"
            style={{ left: `${Math.min(82, Math.max(18, X(hover)))}%` }}
          >
            <p className="font-mono text-[10px] text-slate-400">{hhmm(TIMES[hover])} UTC</p>
            {series.map((s) => (
              <p key={s.label} className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] text-slate-100">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                {s.label} {s.values[hover].toFixed(s.decimals)}
                <span className="text-slate-500">{s.unit}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[10px] text-slate-500">
        <span>{hhmm(TIMES[0])}</span>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
        <span>{hhmm(TIMES[N - 1])} UTC</span>
      </div>
    </div>
  );
}

function ZoneHeader({
  zone,
  icon: Icon,
  title,
  subtitle,
  status,
  onClose,
}: {
  zone: Zone;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  status: ZoneStatus;
  onClose: () => void;
}) {
  const c = ZONE_CONFIG[zone];
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4"
      style={{ borderColor: `${c.color}55`, background: `linear-gradient(135deg, ${c.color}22 0%, rgba(15,23,42,0.6) 55%)` }}
    >
      <div aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl" style={{ background: `${c.color}33` }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
            style={{ background: `${c.color}1f`, color: c.color, border: `1px solid ${c.color}55`, boxShadow: `0 0 24px -4px ${c.color}88` }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: c.color }}>
              {c.index} · {c.title}
            </p>
            <h2 className="mt-1 text-base font-semibold leading-snug text-white">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close zone panel"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative mt-3 flex items-center gap-2">
        <StatusBadge status={status} />
        <span className="font-mono text-[10px] text-slate-500">updated {hhmm(LAST.t)} UTC</span>
      </div>
    </div>
  );
}

function Mechanism({ items, color }: { items: { title: string; body: string }[]; color: string }) {
  return (
    <Section title="Pathophysiology notes" icon={Microscope}>
      <ol className="space-y-3">
        {items.map((it, i) => (
          <li key={it.title} className="flex gap-3">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[10px]" style={{ background: `${color}22`, color }}>
              {i + 1}
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-200">{it.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{it.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Biomarker({ name, unit, value, preflight, source }: { name: string; unit: string; value: number; preflight: number; source: string }) {
  const delta = pct(value, preflight);
  const ratio = Math.min(1, value / (Math.max(value, preflight) * 1.15));
  const base = Math.min(1, preflight / (Math.max(value, preflight) * 1.15));
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-950/40 p-2.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold text-violet-200">{name}</span>
        <span className={`font-mono text-[10px] ${delta > 0 ? "text-rose-300" : "text-emerald-300"}`}>{signed(delta, 0)}%</span>
      </div>
      <p className="mt-1 font-mono text-sm text-white">
        {value}
        <span className="ml-1 text-[10px] text-slate-500">{unit}</span>
      </p>
      <div className="relative mt-1.5 h-1 rounded-full bg-slate-800">
        <div className="absolute inset-y-0 left-0 rounded-full bg-violet-400/80" style={{ width: `${ratio * 100}%` }} />
        <div className="absolute -top-0.5 h-2 w-px bg-slate-300" style={{ left: `${base * 100}%` }} title={`Preflight ${preflight}`} />
      </div>
      <p className="mt-1 text-[10px] text-slate-500">{source}</p>
    </div>
  );
}

/* ───────────────────────── Zone panels ───────────────────────── */

function HeadPanel({ onClose }: { onClose: () => void }) {
  const no = metrics.neuroOcular;
  const tlpd = LAST.iop - LAST.icp;
  const tlpdPre = BASE.iop - BASE.icp;
  const bbbPeak = Math.max(...col("bbb"));

  return (
    <div className="space-y-4">
      <ZoneHeader
        zone="head"
        icon={Eye}
        title="Retinal vascular changes and intracranial pressure"
        subtitle="Spaceflight-Associated Neuro-ocular Syndrome (SANS) · Blood–Brain Barrier integrity"
        status={STATUSES.head}
        onClose={onClose}
      />

      <div className="grid grid-cols-2 gap-2.5">
        <Kpi
          label="IOP"
          value={fmt(LAST.iop)}
          unit="mmHg"
          accent="#22d3ee"
          status={levelOf(LAST.iop, TH.iop)}
          sub={`Preflight ${fmt(BASE.iop)}`}
          tip="Intraocular pressure (rebound tonometry). Rises 1–3 mmHg within hours of weightlessness as the cephalad fluid shift expands choroidal blood volume and raises episcleral venous pressure; partially re-equilibrates over weeks."
        />
        <Kpi
          label="ICP · non-invasive"
          value={fmt(LAST.icp)}
          unit="mmHg"
          accent="#818cf8"
          status={levelOf(LAST.icp, TH.icp)}
          sub={`Preflight ${fmt(BASE.icp)} seated`}
          tip="Estimated from ONSD ultrasound and transcranial Doppler pulsatility index. In microgravity ICP is higher than upright terrestrial values and is never relieved by posture, imposing a chronic 24-h load on the optic nerve head."
        />
        <Kpi
          label="Translaminar ΔP"
          value={fmt(tlpd)}
          unit="mmHg"
          accent="#a5f3fc"
          status={tlpd < 3 ? "watch" : "nominal"}
          sub={`Preflight ${fmt(tlpdPre)}`}
          tip="IOP − ICP across the lamina cribrosa. A reduced gradient displaces the lamina anteriorly, impairs orthograde axoplasmic flow and favours optic disc edema — a central SANS mechanism."
        />
        <Kpi
          label="ONSD"
          value={no.onsdMm.toFixed(2)}
          unit="mm"
          accent="#67e8f9"
          status={no.onsdMm > 5.8 ? "watch" : "nominal"}
          sub={`${signed(pct(no.onsdMm, no.onsdPreflightMm))}% vs preflight`}
          tip="Optic nerve sheath diameter, 3 mm posterior to the globe. Values above 5.8–6.0 mm correlate with ICP > 20 mmHg terrestrially; in-flight distension reflects perineural CSF accumulation within the optic nerve sheath."
        />
      </div>

      <Section
        title="IOP vs ICP · 24 h"
        icon={Gauge}
        right={<Tip text="Overnight rise during the sleep period reflects reduced sympathetic venous tone and maximal cranial venous congestion; the narrowing IOP−ICP gap is the SANS-relevant signal, not IOP alone." />}
      >
        <TrendChart
          series={[
            { label: "IOP", color: "#22d3ee", values: col("iop"), unit: "mmHg", decimals: 1 },
            { label: "ICP", color: "#818cf8", values: col("icp"), unit: "mmHg", decimals: 1, fill: false },
          ]}
          threshold={{ value: TH.iop.watch, label: `IOP watch ${TH.iop.watch}` }}
          bands={bandsOf("sleep")}
        />
      </Section>

      <Section title="Retinal vascular changes · OCT / fundus" icon={Eye}>
        <dl className="divide-y divide-slate-800">
          <Row
            label="Retinal venous diameter"
            value={`${signed(no.retinalVenousDiameterDeltaPct)}%`}
            tone="bad"
            tip="Venous engorgement from impaired cerebral/ophthalmic venous outflow (jugular stasis). Measured with semi-automated vessel calibre analysis on fundus images."
          />
          <Row
            label="Retinal arteriolar diameter"
            value={`${signed(no.retinalArteriolarDiameterDeltaPct)}%`}
            tip="Mild arteriolar narrowing lowers the arteriole-to-venule ratio, consistent with venous congestion rather than arterial hypertension."
          />
          <Row
            label="Choroidal thickness"
            value={`+${no.choroidalThickeningUm} µm`}
            tone="bad"
            tip="Choroidal engorgement (EDI-OCT) is among the earliest in-flight findings; the vascular choroid expands with headward fluid shift and drives chorioretinal folds."
          />
          <Row
            label="Peripapillary RNFL"
            value={`+${no.rnflThickeningUm} µm`}
            tone="bad"
            tip="Peripapillary total retinal thickening is the most sensitive OCT marker of optic disc edema in SANS."
          />
          <Row label="Optic disc edema · Frisén" value={`Grade ${no.frisenGrade}`} tone="warn" />
          <Row label="Chorioretinal folds" value={no.chorioretinalFolds ? "Present" : "Absent"} tone={no.chorioretinalFolds ? "warn" : "good"} />
          <Row label="Globe flattening" value={no.globeFlattening} tone="warn" />
          <Row
            label="Cabin ppCO₂"
            value={`${metrics.mission.cabinPpCO2mmHg} mmHg`}
            tip="Chronically elevated ambient CO₂ (2–4 mmHg on ISS vs ~0.3 mmHg on Earth) causes cerebral vasodilation and is a proposed SANS co-factor."
          />
        </dl>
      </Section>

      <Section
        title="Blood–Brain Barrier · space radiation"
        icon={Brain}
        right={<span className="font-mono text-[10px] text-slate-500">peak {bbbPeak.toFixed(2)}×</span>}
      >
        <TrendChart
          series={[{ label: "Kᴛʀᴀɴs index", color: "#a78bfa", values: col("bbb"), unit: "×", decimals: 2 }]}
          threshold={{ value: TH.bbb.watch, label: `watch ${TH.bbb.watch}×` }}
          bands={bandsOf("saa")}
          height={120}
        />
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          Permeability peaks lag SAA proton transits by ~1 h, consistent with ROS-driven MMP-9 activation and tight-junction remodelling rather than
          direct ionisation damage.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {no.bbbMarkers.map((m) => (
            <Biomarker key={m.name} {...m} />
          ))}
        </div>
      </Section>

      <Mechanism
        color="#22d3ee"
        items={[
          {
            title: "Cephalad fluid shift & venous congestion",
            body: "Loss of the hydrostatic gradient moves ~1.5–2 L of fluid headward, distending the internal jugular veins and raising choroidal and ophthalmic venous volume — the leading driver of choroidal folds and disc edema.",
          },
          {
            title: "Altered translaminar pressure",
            body: "ICP is mildly elevated relative to upright terrestrial posture and never unloads; the chronically reduced IOP−ICP gradient across the lamina cribrosa is implicated in posterior globe flattening and axoplasmic stasis.",
          },
          {
            title: "HZE ions & BBB tight junctions",
            body: "Galactic cosmic ray HZE nuclei (⁵⁶Fe, ²⁸Si) and trapped SAA protons induce endothelial oxidative stress, MMP-9 activation and loss of claudin-5, occludin and ZO-1, raising the Kᴛʀᴀɴs permeability constant.",
          },
          {
            title: "Glial & axonal biomarkers",
            body: "Concurrent rises in serum S100B and GFAP with moderate NfL elevation indicate astroglial activation with early axonal stress rather than gross barrier failure.",
          },
        ]}
      />
    </div>
  );
}

function ChestPanel({ onClose }: { onClose: () => void }) {
  const en = metrics.endothelial;
  const cv = metrics.cardiovascular;
  const fold = (gene: string) => en.pathway.find((p) => p.gene === gene)?.fold ?? 1;

  const cascade = [
    { label: "Wall shear stress", value: `${signed(pct(en.shearStressDynCm2, en.shearStressPreflightDynCm2), 0)}%` },
    { label: "KLF2", value: `${fold("KLF2").toFixed(2)}×` },
    { label: "JAG2 ligand", value: `${fold("JAG2").toFixed(2)}×` },
    { label: "NOTCH4 → NICD4", value: `${(en.nicd4NuclearFraction * 100).toFixed(0)}% nuclear` },
    { label: "HEY1 / HES1", value: `${fold("HEY1").toFixed(2)}× / ${fold("HES1").toFixed(2)}×` },
    { label: "eNOS · NO", value: `${fold("NOS3").toFixed(2)}×` },
    { label: "FMD", value: `${fmt(LAST.fmd)}%` },
  ];

  return (
    <div className="space-y-4">
      <ZoneHeader
        zone="chest"
        icon={HeartPulse}
        title="Endothelial Jag2 function / Notch4 pathway disruption"
        subtitle="Microgravity-induced cardiovascular shift · vascular mechanotransduction"
        status={STATUSES.chest}
        onClose={onClose}
      />

      <div className="grid grid-cols-2 gap-2.5">
        <Kpi
          label="Notch disruption idx"
          value={fmt(LAST.ndi)}
          unit="/100"
          accent="#fb7185"
          status={levelOf(LAST.ndi, TH.ndi)}
          sub={`Preflight ${fmt(BASE.ndi)}`}
          tip="Composite (0–100) of JAG2, NOTCH4, NICD4 nuclear fraction, HEY1/HES1 and NOS3 deviation from preflight, weighted by pathway position. >35 indicates clinically relevant loss of endothelial Notch tone."
        />
        <Kpi
          label="Jag2 function"
          value={(LAST.jag2 * 100).toFixed(0)}
          unit="% preflight"
          accent="#fda4af"
          status={LAST.jag2 < 0.7 ? "watch" : "nominal"}
          sub={`24 h ${signed((LAST.jag2 - FIRST.jag2) * 100, 0)} pp`}
          tip="Endothelial surface Jagged-2 presentation (flow cytometry of CECs, normalised). JAG2 trans-activates NOTCH4 on adjacent endothelial cells; expression is shear-dependent."
        />
        <Kpi
          label="Notch4 activity"
          value={(LAST.notch4 * 100).toFixed(0)}
          unit="% preflight"
          accent="#f472b6"
          status={LAST.notch4 < 0.7 ? "watch" : "nominal"}
          sub={`NICD4 ${(en.nicd4NuclearFraction * 100).toFixed(0)}% vs ${(en.nicd4NuclearFractionPreflight * 100).toFixed(0)}%`}
          tip="γ-secretase-cleaved Notch4 intracellular domain (NICD4) nuclear fraction by imaging cytometry — the direct readout of canonical Notch4 signalling."
        />
        <Kpi
          label="FMD"
          value={fmt(LAST.fmd)}
          unit="%"
          accent="#fecdd3"
          status={levelOf(LAST.fmd, TH.fmd)}
          sub={`Preflight ${fmt(en.fmdPreflightPct)}%`}
          tip="Brachial flow-mediated dilation — the functional bioassay of endothelial NO bioavailability. Values < 5% indicate endothelial dysfunction."
        />
      </div>

      <Section
        title="Jag2 / Notch4 activity · 24 h"
        icon={Activity}
        right={<Tip text="Transient recovery during the CEVIS aerobic session demonstrates the shear-dependence of the axis: exercise-induced flow restores Jag2–Notch4 signalling within the hour, then decays." />}
      >
        <TrendChart
          series={[
            { label: "JAG2", color: "#fb7185", values: col("jag2"), unit: "×", decimals: 2 },
            { label: "NOTCH4", color: "#c084fc", values: col("notch4"), unit: "×", decimals: 2, fill: false },
          ]}
          domain={[0.5, 1.05]}
          threshold={{ value: 1, label: "preflight 1.0×", color: "#64748b" }}
          bands={bandsOf("exercise")}
        />
      </Section>

      <Section title="Notch disruption index · 24 h" icon={Waves}>
        <TrendChart
          series={[{ label: "NDI", color: "#f43f5e", values: col("ndi"), unit: "/100", decimals: 1 }]}
          threshold={{ value: TH.ndi.watch, label: `watch ${TH.ndi.watch}` }}
          bands={bandsOf("exercise", "sleep")}
          height={110}
        />
      </Section>

      <Section
        title="Pathway transcriptomics"
        icon={Dna}
        right={<span className="font-mono text-[10px] text-slate-500">log₂ FC vs preflight</span>}
      >
        <p className="mb-3 text-[11px] text-slate-500">{en.assay}</p>
        <div className="space-y-1.5">
          {en.pathway.map((g) => {
            const l2 = Math.log2(g.fold);
            const w = Math.min(Math.abs(l2), 1) * 50;
            const down = l2 < 0;
            return (
              <div key={g.gene} className="group grid grid-cols-[64px_1fr_54px] items-center gap-2" title={`${g.role} · p = ${g.p}`}>
                <span className="font-mono text-[11px] text-slate-300 transition-colors group-hover:text-white">{g.gene}</span>
                <div className="relative h-4 rounded bg-slate-800/80">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-slate-500" />
                  <div
                    className="absolute inset-y-0.5 rounded-sm transition-opacity group-hover:opacity-100"
                    style={{
                      left: down ? `${50 - w}%` : "50%",
                      width: `${w}%`,
                      opacity: 0.85,
                      background: down ? "linear-gradient(90deg,#e11d48,#fb7185)" : "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                    }}
                  />
                </div>
                <span className={`text-right font-mono text-[11px] tabular-nums ${down ? "text-rose-300" : "text-sky-300"}`}>{g.fold.toFixed(2)}×</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 grid grid-cols-[64px_1fr_54px] gap-2 font-mono text-[9px] text-slate-500">
          <span />
          <div className="flex justify-between">
            <span>−1</span>
            <span>0</span>
            <span>+1</span>
          </div>
          <span />
        </div>
      </Section>

      <Section title="Signalling cascade · microgravity" icon={ChevronRight}>
        <div className="flex flex-wrap items-center gap-1.5">
          {cascade.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className="rounded-lg border border-rose-500/25 bg-rose-500/5 px-2.5 py-1.5">
                <p className="text-[10px] font-medium text-slate-200">{s.label}</p>
                <p className="font-mono text-[10px] text-rose-300">↓ {s.value}</p>
              </div>
              {i < cascade.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-slate-600" />}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Row label="Circulating ECs" value={`${en.cecPerMl}/mL`} tone="bad" sub={`${(en.cecPerMl / en.cecPreflightPerMl).toFixed(1)}×`} />
          <Row label="Endothelial MPs" value={`${en.empPerUl}/µL`} tone="bad" sub={`${signed(pct(en.empPerUl, en.empPreflightPerUl), 0)}%`} />
        </div>
      </Section>

      <Section title="Cardiovascular shift" icon={Droplets}>
        <dl className="divide-y divide-slate-800">
          <Row label="Cephalad fluid shift" value={`${cv.cephaladShiftL} L`} tone="warn" />
          <Row
            label="IJV cross-section"
            value={`${cv.jugularCsaMm2} mm²`}
            tone="bad"
            sub={`${signed(pct(cv.jugularCsaMm2, cv.jugularCsaPreflightMm2), 0)}%`}
            tip="Internal jugular vein distension with stagnant or retrograde flow has been documented in-flight and carries venous thrombosis risk."
          />
          <Row label="IJV flow pattern" value={cv.jugularFlowGrade} tone="warn" />
          <Row label="Stroke volume" value={`${cv.strokeVolumeMl} mL`} sub={`${signed(pct(cv.strokeVolumeMl, cv.strokeVolumePreflightMl), 0)}%`} />
          <Row label="Cardiac output" value={`${cv.cardiacOutputLmin} L/min`} />
          <Row label="Plasma volume" value={`${signed(cv.plasmaVolumeDeltaPct)}%`} tone="warn" />
          <Row label="Pulse wave velocity" value={`${cv.pwvMs} m/s`} tone="warn" sub={`pre ${cv.pwvPreflightMs}`} />
          <Row label="Carotid IMT" value={`${cv.carotidImtMm} mm`} tone="warn" sub={`pre ${cv.carotidImtPreflightMm}`} />
        </dl>
      </Section>

      <Mechanism
        color="#fb7185"
        items={[
          {
            title: "Loss of hemodynamic loading",
            body: "Without gravitational pressure gradients, arterial wall shear stress falls. Notch receptors (NOTCH1/4) and ligands (JAG1/JAG2/DLL4) are shear-responsive mechanotransducers downstream of KLF2.",
          },
          {
            title: "Jag2 → Notch4 signal attenuation",
            body: "Reduced endothelial Jag2 presentation decreases ADAM10/γ-secretase cleavage of Notch4, lowering NICD4 nuclear translocation and RBPJ-dependent transcription of HEY1/HES1.",
          },
          {
            title: "Endothelial dysfunction",
            body: "Attenuated Notch output destabilises arterial identity and adherens junctions and couples to reduced NOS3 expression and NO bioavailability — captured functionally as falling FMD and rising PWV.",
          },
          {
            title: "Pro-inflammatory, pro-angiogenic shift",
            body: "Compensatory KDR (VEGFR2) and ICAM1 up-regulation with elevated circulating endothelial cells and microparticles indicate active endothelial injury, amplified by radiation-induced ROS.",
          },
        ]}
      />
    </div>
  );
}

function ArmPanel({ onClose }: { onClose: () => void }) {
  const v = metrics.vitals;
  const rad = metrics.radiation;
  const hr = col("hr");
  const doseEq = (DOSE_24H_UGY * rad.qualityFactorAvg) / 1000;
  const careerPct = (rad.missionCumulativeMsv / rad.careerLimitMsv) * 100;

  return (
    <div className="space-y-4">
      <ZoneHeader
        zone="arm"
        icon={Activity}
        title="General vitals · radiation exposure"
        subtitle="Wrist Bio-Monitor ECG · personal active dosimetry"
        status={STATUSES.arm}
        onClose={onClose}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Kpi label="Heart rate" value={String(LAST.hr)} unit="bpm" accent="#fbbf24" status={levelOf(LAST.hr, TH.hr)} sub={`min ${Math.min(...hr)} · max ${Math.max(...hr)}`} />
        <Kpi
          label="HRV · RMSSD"
          value={String(v.hrvRmssdMs)}
          unit="ms"
          accent="#fde68a"
          sub={`Preflight ${v.hrvRmssdPreflightMs}`}
          tip="Root-mean-square of successive RR differences — vagal tone marker. Modest in-flight reduction reflects altered baroreflex loading and sleep disruption."
        />
        <Kpi label="SpO₂" value={String(v.spo2Pct)} unit="%" accent="#5eead4" status="nominal" sub="Pulse oximetry" />
        <Kpi label="Blood pressure" value={`${v.bpSystolic}/${v.bpDiastolic}`} unit="mmHg" accent="#e2e8f0" status="nominal" sub="Oscillometric" />
        <Kpi
          label="Core temp"
          value={v.coreTempC.toFixed(1)}
          unit="°C"
          accent="#fdba74"
          status={v.coreTempC > 37.5 ? "watch" : "nominal"}
          sub="Dual-sensor heat flux"
          tip="Core body temperature runs ~1 °C higher in long-duration flight (space fever) due to impaired convective heat loss in microgravity."
        />
        <Kpi label="Resp. rate" value={String(v.respRate)} unit="/min" accent="#93c5fd" status="nominal" sub="Thoracic impedance" />
      </div>

      <Section title="Heart rate · 24 h" icon={HeartPulse}>
        <TrendChart
          series={[{ label: "HR", color: "#fbbf24", values: hr, unit: "bpm", decimals: 0 }]}
          threshold={{ value: TH.hr.watch, label: `watch ${TH.hr.watch}` }}
          bands={bandsOf("sleep", "exercise")}
        />
      </Section>

      <Section
        title="Radiation exposure"
        icon={Radiation}
        right={
          <span className={`font-mono text-[10px] ${rad.solarParticleEvent ? "text-rose-300" : "text-emerald-300"}`}>
            SPE {rad.solarParticleEvent ? "ACTIVE" : "none"} · Kp {rad.kpIndex}
          </span>
        }
      >
        <div className="mb-3 grid grid-cols-2 gap-2.5">
          <Kpi label="Dose rate" value={fmt(LAST.dose)} unit="µGy/h" accent="#fcd34d" status={levelOf(LAST.dose, TH.dose)} sub={`peak ${Math.max(...col("dose")).toFixed(1)}`} />
          <Kpi
            label="24 h absorbed"
            value={DOSE_24H_UGY.toFixed(0)}
            unit="µGy"
            accent="#fcd34d"
            sub={`≈ ${doseEq.toFixed(2)} mSv eq. (Q ${rad.qualityFactorAvg})`}
            tip="Absorbed dose integrated from hourly active-dosimeter samples. Dose equivalent applies the mean LET-weighted quality factor for the ISS mixed GCR + trapped-proton field."
          />
        </div>
        <TrendChart
          series={[{ label: "Dose rate", color: "#f59e0b", values: col("dose"), unit: "µGy/h", decimals: 1 }]}
          threshold={{ value: TH.dose.watch, label: `watch ${TH.dose.watch}` }}
          bands={bandsOf("saa")}
          height={110}
        />
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldAlert className="h-3.5 w-3.5" /> Mission cumulative vs career limit
              <Tip text="NASA's 600 mSv career effective-dose limit applies uniformly across age and sex. Mission dose integrates GCR and SAA contributions behind ~20 g/cm² Al-equivalent shielding." side="right" />
            </span>
            <span className="font-mono text-slate-200">
              {rad.missionCumulativeMsv} / {rad.careerLimitMsv} mSv
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full" style={{ width: `${careerPct}%`, background: "linear-gradient(90deg,#fbbf24,#f97316)" }} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
            <span>{careerPct.toFixed(1)}% used</span>
            <span>
              {rad.saaPasses24h} SAA passes / 24 h · {rad.shieldingGcm2} g/cm²
            </span>
          </div>
        </div>
      </Section>

      <Mechanism
        color="#fbbf24"
        items={[
          {
            title: "Chronotropic adaptation",
            body: "Resting HR typically falls early in flight as the central fluid shift raises preload and stroke volume; the CEVIS session shows preserved chronotropic reserve.",
          },
          {
            title: "SAA proton transits",
            body: "Passes through the South Atlantic Anomaly produce trapped-proton dose-rate spikes several-fold above the GCR background, clustered in consecutive orbits.",
          },
          {
            title: "Cumulative risk budget",
            body: "Long-duration LEO missions accrue roughly 0.5–0.8 mSv/day; cumulative effective dose drives cancer, cardiovascular and CNS risk projections.",
          },
        ]}
      />
    </div>
  );
}

function OverviewPanel({ onSelect }: { onSelect: (z: Zone) => void }) {
  const summary: Record<Zone, string> = {
    head: `IOP ${fmt(LAST.iop)} · ICP ${fmt(LAST.icp)} mmHg`,
    chest: `NDI ${fmt(LAST.ndi)} · FMD ${fmt(LAST.fmd)}%`,
    arm: `HR ${LAST.hr} bpm · ${fmt(LAST.dose)} µGy/h`,
  };
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/30">
            <MousePointerClick className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Select an anatomical zone</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Click the head, chest or arm on the astronaut model to load zone-specific physiology, 24 h trends and mechanistic annotations.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {ZONE_ORDER.map((z) => {
            const c = ZONE_CONFIG[z];
            return (
              <button
                key={z}
                type="button"
                onClick={() => onSelect(z)}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-700/50 bg-slate-900/50 px-3.5 py-3 text-left transition-all hover:border-slate-500/60 hover:bg-slate-800/60"
              >
                <div className="flex items-center gap-3">
                  <span className="h-8 w-1 rounded-full" style={{ background: c.color, boxShadow: `0 0 12px ${c.color}` }} />
                  <div>
                    <p className="text-xs font-semibold text-slate-100">
                      {c.title} <span className="font-normal text-slate-500">· {c.sublabel}</span>
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">{summary[z]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={STATUSES[z]} />
                  <ChevronRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
          <TriangleAlert className="h-3.5 w-3.5 text-amber-300" /> Active flags
          <span className="ml-auto rounded-full bg-slate-700/60 px-2 py-0.5 font-mono text-[10px] text-slate-300">{FLAGS.length}</span>
        </h3>
        {FLAGS.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
            <CircleCheck className="h-4 w-4" /> All monitored parameters nominal.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {FLAGS.map((f) => (
              <li key={f.key}>
                <button
                  type="button"
                  onClick={() => onSelect(f.zone)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-2 text-left transition-colors hover:bg-slate-800/60"
                >
                  <span className="flex items-center gap-2 text-xs text-slate-300">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[f.status].dot}`} />
                    {f.label}
                  </span>
                  <span className={`font-mono text-xs ${STATUS_STYLE[f.status].text}`}>
                    {f.value.toFixed(f.d)} {f.unit}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ───────────────────────── Layout pieces ───────────────────────── */

function Chip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-1.5">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className="font-mono text-xs text-slate-100">{value}</span>
    </div>
  );
}

function Header() {
  const clock = useUtcClock();
  const m = metrics.mission;
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-700/50 bg-slate-800/40 px-5 py-3.5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-400/30">
          <Satellite className="h-5 w-5 text-cyan-300" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-white">Space Medicine Dashboard</h1>
          <p className="font-mono text-[11px] text-slate-400">
            {m.platform} · {m.crewMember}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip icon={Orbit} label="Mission" value={m.id} />
        <Chip icon={Clock} label="MD" value={String(m.missionDay)} />
        <Chip icon={Satellite} label="Alt" value={`${m.altitudeKm} km`} />
        <Chip icon={Activity} label="Orbit" value={`#${m.orbit}`} />
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono text-xs text-emerald-200">AOS · {clock ?? "--:--:--"} UTC</span>
        </div>
      </div>
    </header>
  );
}

function MetricCard({ def, active, onClick }: { def: OverviewDef; active: boolean; onClick: () => void }) {
  const Icon = def.icon;
  const values = col(def.key);
  const cur = LAST[def.key];
  const delta = cur - FIRST[def.key];
  const status = levelOf(cur, def.th);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-xl border p-3.5 text-left transition-all duration-200 ${
        active ? "border-slate-500/70 bg-slate-800/80" : "border-slate-700/50 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/50"
      }`}
      style={active ? { boxShadow: `0 0 0 1px ${def.color}55, 0 0 30px -8px ${def.color}88` } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${def.color}1a`, color: def.color }}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-200">{def.label}</p>
            <p className="text-[10px] text-slate-500">{def.sub}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xl font-semibold tabular-nums text-white">{cur.toFixed(def.decimals)}</span>
          <span className="text-[11px] text-slate-500">{def.unit}</span>
        </div>
        <span className="font-mono text-[10px] text-slate-500">24 h {signed(delta, def.decimals)}</span>
      </div>
      <div className="mt-2">
        <Sparkline values={values} color={def.color} />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
        <span>preflight {BASE[def.key]}</span>
        <span>
          {Math.min(...values).toFixed(def.decimals)}–{Math.max(...values).toFixed(def.decimals)}
        </span>
      </div>
    </button>
  );
}

function EnvironmentCard() {
  const m = metrics.mission;
  const rad = metrics.radiation;
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Habitat environment</h3>
      <dl className="divide-y divide-slate-800">
        <Row label="Cabin pressure" value={`${m.cabinPressureKpa} kPa`} />
        <Row label="ppCO₂" value={`${m.cabinPpCO2mmHg} mmHg`} tone="warn" />
        <Row label="Inclination" value={`${m.inclinationDeg}°`} />
        <Row label="24 h absorbed dose" value={`${DOSE_24H_UGY.toFixed(0)} µGy`} />
        <Row label="Mission dose" value={`${rad.missionCumulativeMsv} mSv`} />
      </dl>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <Wind className="h-3 w-3" /> ECLSS nominal
        </span>
        <span className="flex items-center gap-1">
          <Thermometer className="h-3 w-3" /> 22.4 °C
        </span>
      </div>
    </Card>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function Page() {
  const [zone, setZone] = useState<Zone | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZone(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hud = [
    { label: "IOP", value: fmt(LAST.iop), unit: "mmHg", color: "#22d3ee" },
    { label: "ICP", value: fmt(LAST.icp), unit: "mmHg", color: "#818cf8" },
    { label: "NDI", value: fmt(LAST.ndi), unit: "/100", color: "#fb7185" },
    { label: "Dose", value: fmt(LAST.dose), unit: "µGy/h", color: "#fbbf24" },
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-900 text-slate-100 antialiased">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(1200px 600px at 50% -10%, rgba(34,211,238,0.10), transparent 60%), radial-gradient(800px 500px at 100% 100%, rgba(244,63,94,0.07), transparent 60%), radial-gradient(700px 500px at 0% 80%, rgba(139,92,246,0.06), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          backgroundImage: "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />

      <div className="relative mx-auto max-w-[1680px] px-4 pb-10 pt-5 lg:px-6">
        <Header />

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* Left: vitals overview */}
          <aside className="space-y-3 xl:col-span-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Vitals · last 24 h</h2>
              <span className="font-mono text-[10px] text-slate-500">{metrics.mission.sampleIntervalMin} min res.</span>
            </div>
            {OVERVIEW.map((d) => (
              <MetricCard key={d.key} def={d} active={zone === d.zone} onClick={() => setZone(zone === d.zone ? null : d.zone)} />
            ))}
            <EnvironmentCard />
          </aside>

          {/* Center: astronaut model */}
          <section className="xl:col-span-5">
            <div className="xl:sticky xl:top-5">
              <Card className="p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-300/80">Biometric digital twin</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">Interactive Astronaut Model</h2>
                    <p className="text-xs text-slate-400">
                      Window {hhmm(TIMES[0])}–{hhmm(TIMES[N - 1])} UTC · MD {metrics.mission.missionDay}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(STATUS_STYLE) as ZoneStatus[]).map((s) => (
                      <span key={s} className="flex items-center gap-1.5 rounded-full border border-slate-700/60 px-2 py-0.5 text-[10px] text-slate-400">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[s].dot}`} />
                        {STATUS_STYLE[s].label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700/40 bg-slate-950/50 p-2">
                  <AstronautModel selectedZone={zone} onZoneSelect={setZone} statuses={STATUSES} heartRate={LAST.hr} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {hud.map((h) => (
                    <div key={h.label} className="rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">{h.label}</p>
                      <p className="font-mono text-sm tabular-nums" style={{ color: h.color }}>
                        {h.value}
                        <span className="ml-1 text-[10px] text-slate-500">{h.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </section>

          {/* Right: zone detail */}
          <aside className="xl:col-span-4">
            <div key={zone ?? "overview"}>
              {zone === "head" && <HeadPanel onClose={() => setZone(null)} />}
              {zone === "chest" && <ChestPanel onClose={() => setZone(null)} />}
              {zone === "arm" && <ArmPanel onClose={() => setZone(null)} />}
              {zone === null && <OverviewPanel onSelect={setZone} />}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}