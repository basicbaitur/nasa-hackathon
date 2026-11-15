"use client";

import { useEffect, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BASELINE, vascularAxis, zScore, type ForecastPoint, type MetricKey, type Status } from "@/lib/engine";
import { GLOW, Panel, SciTip, type ScienceKey, Sparkline, STATUS_COLOR, STATUS_LABEL, StatusChip, post, simClock, type CrewSnap } from "@/components/astro/ui";

export const VITALS: { key: MetricKey; short: string; color: string; d: number; sci: ScienceKey }[] = [
  { key: "iop", short: "IOP", color: "#4CC9F0", d: 1, sci: "iop" },
  { key: "bbb", short: "BBB", color: "#A78BFA", d: 2, sci: "bbb" },
  { key: "ndi", short: "NDI", color: "#FF7A7A", d: 1, sci: "notch" },
  { key: "hr", short: "Heart rate", color: "#FFB454", d: 0, sci: "hr" },
  { key: "dose", short: "Dose rate", color: "#5EE0C1", d: 1, sci: "dose" },
];

export const zStatus = (z: number): Status => (z > 3 ? "alert" : z > 2 ? "watch" : "nominal");
export const worst = (...s: Status[]): Status => (s.includes("alert") ? "alert" : s.includes("watch") ? "watch" : "nominal");

export function Gauge({ score, status }: { score: number; status: Status }) {
  const r = 80;
  const len = Math.PI * r;
  const c = STATUS_COLOR[status];
  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <svg viewBox="0 0 200 115" className="w-full overflow-visible" role="img" aria-label={`Risk score ${score} of 100, status ${STATUS_LABEL[status]}`}>
        <defs>
          <filter id="gauge-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={14} strokeLinecap="round" />
        <path d="M8 100 A92 92 0 0 1 192 100" fill="none" stroke="rgba(76,201,240,0.25)" strokeWidth={0.6} strokeDasharray="1 3" />
        {[45, 75].map((t) => {
          const a = Math.PI * (1 - t / 100);
          return <line key={t} x1={100 + 66 * Math.cos(a)} y1={100 - 66 * Math.sin(a)} x2={100 + 94 * Math.cos(a)} y2={100 - 94 * Math.sin(a)} stroke="#9AABC4" strokeWidth={1.5} />;
        })}
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke={c}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - score / 100)}
          filter="url(#gauge-glow)"
          style={{ transition: "stroke-dashoffset .6s, stroke .3s" }}
        />
        <text x="100" y="88" textAnchor="middle" fontSize="42" fontWeight="700" fill={c} fontFamily="var(--font-space-grotesk)" style={{ filter: `drop-shadow(0 0 10px ${c})` }}>
          {score}
        </text>
        <text x="100" y="108" textAnchor="middle" fontSize="8" letterSpacing="3" fill="#9AABC4" fontFamily="var(--font-geist-mono)">
          RISK / 100
        </text>
      </svg>
      <div className="mt-1 flex justify-center">
        <StatusChip status={status} size="lg" />
      </div>
      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Nominal &lt;45 · Watch 45–75 · Alert &gt;75</p>
    </div>
  );
}

export function Contributions({ risk }: { risk: CrewSnap["subject"]["risk"] }) {
  return (
    <ul className="space-y-4">
      {risk.contributions.map((c) => (
        <li key={c.key}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span>
              {c.label} <span className="text-muted">· w {Math.round(c.weight * 100)}%</span>
            </span>
            <span className="font-mono tabular-nums">
              z {c.z >= 0 ? "+" : ""}
              {c.z.toFixed(1)} · <b>{c.points.toFixed(0)} pts</b> <span className="text-muted">({Math.round(c.share * 100)}%)</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/5" aria-hidden>
            <div
              className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 shadow-[0_0_12px_rgba(76,201,240,0.8)] transition-all duration-700"
              style={{ width: `${Math.min(100, (c.points / (c.weight * 100)) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function VascularAxis({ ndi, bbb }: { ndi: number; bbb: number }) {
  const v = vascularAxis(ndi);
  const steps: { k: ScienceKey; label: string; value: string; bad: boolean }[] = [
    { k: "notch", label: "Notch axis", value: `NDI ${ndi.toFixed(0)}`, bad: zScore("ndi", ndi) > 2 },
    { k: "jag2", label: "Jag2", value: `${v.jag2.toFixed(2)}×`, bad: v.jag2 > 1.27 },
    { k: "notch4", label: "Notch4", value: `${Math.round(v.notch4 * 100)}%`, bad: v.notch4 < 0.89 },
    { k: "bbb", label: "BBB", value: `${bbb.toFixed(2)}×`, bad: zScore("bbb", bbb) > 2 },
  ];
  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-accent/80">Mechanism · endothelial Notch → barrier integrity</p>
      <ol className="mt-2 flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => (
          <li key={s.k} className="flex items-center gap-1.5">
            <span
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-[11px] transition-colors ${
                s.bad ? "border-alert/50 bg-alert/10 text-alert shadow-[0_0_10px_rgba(255,122,122,0.3)]" : "border-white/10 text-ink hover:border-accent/40"
              }`}
            >
              {s.label} <b className="font-semibold">{s.value}</b>
              <SciTip k={s.k} side={i >= 2 ? "left" : "right"} />
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden className="text-muted">
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function VitalCard({ k, snap, tipSide = "right" }: { k: (typeof VITALS)[number]; snap: CrewSnap; tipSide?: "left" | "right" }) {
  const b = BASELINE[k.key];
  const v = snap.subject.metrics[k.key];
  const z = zScore(k.key, v);
  const st = zStatus(z);
  return (
    <div className={`print-panel glass ${GLOW[st]} rounded-2xl p-4 transition-transform hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            {k.short} <SciTip k={k.sci} side={tipSide} />
          </p>
          <p className="text-[10px] text-muted">{b.label}</p>
        </div>
        <StatusChip status={st} />
      </div>
      <p className="mt-3 font-mono text-3xl font-semibold tabular-nums" style={{ color: k.color, textShadow: `0 0 14px ${k.color}88` }}>
        {v.toFixed(k.d)} <span className="text-xs font-normal text-muted">{b.unit}</span>
      </p>
      <div className="mt-2">
        <Sparkline values={snap.subject.live[k.key]} color={k.color} height={40} band={[b.mean - 2 * b.std, b.mean + 2 * b.std]} />
      </div>
      <p className="mt-2 flex justify-between font-mono text-[10px] text-muted">
        <span>
          base {b.mean} ± {b.std}
        </span>
        <span>
          z {z >= 0 ? "+" : ""}
          {z.toFixed(1)}
        </span>
      </p>
    </div>
  );
}

export function WhatIf({ ndi }: { ndi: number }) {
  const [dose, setDose] = useState(10);
  const [series, setSeries] = useState<ForecastPoint[]>([]);
  const ndiBucket = Math.round(ndi / 2);
  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await post<{ series: ForecastPoint[] }>("/api/forecast", { extraDoseMSv: dose });
      setSeries(r.series);
    }, 120);
    return () => clearTimeout(t);
  }, [dose, ndiBucket]);
  const peak = series.reduce((m, p) => (p.ndi > m.ndi ? p : m), { h: 0, ndi: 0 } as ForecastPoint);
  return (
    <Panel title="What-if · 72 h NDI forecast" right={<span className="rounded-md border border-alert/40 bg-alert/10 px-2 py-0.5 font-mono text-[11px] text-alert shadow-[0_0_10px_rgba(255,122,122,0.25)]">peak {peak.ndi.toFixed(1)} @ +{peak.h} h</span>}>
      <label htmlFor="dose" className="flex items-center justify-between text-xs">
        <span>Additional dose exposure</span>
        <span className="neon-text font-mono text-base text-accent">{dose} mSv</span>
      </label>
      <input id="dose" type="range" min={0} max={40} step={1} value={dose} onChange={(e) => setDose(Number(e.target.value))} className="mt-2 w-full" />
      <div className="mt-3 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="fc-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#FF7A7A" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#FF7A7A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <XAxis dataKey="h" tick={{ fill: "#9AABC4", fontSize: 10 }} tickFormatter={(h) => `+${h}h`} interval={5} stroke="#22314D" />
            <YAxis tick={{ fill: "#9AABC4", fontSize: 10 }} stroke="#22314D" domain={[0, (max: number) => Math.max(40, Math.ceil(max / 10) * 10)]} />
            <ReferenceArea y1={BASELINE.ndi.mean - 2 * BASELINE.ndi.std} y2={BASELINE.ndi.mean + 2 * BASELINE.ndi.std} fill="#5EE0C1" fillOpacity={0.07} />
            <Tooltip contentStyle={{ background: "rgba(10,15,26,0.9)", border: "1px solid rgba(76,201,240,0.4)", borderRadius: 8, fontSize: 12, backdropFilter: "blur(8px)" }} labelFormatter={(h) => `+${h} h`} />
            <Area type="monotone" dataKey="ndi" name="Projected NDI" stroke="#FF7A7A" fill="url(#fc-fill)" strokeWidth={2.5} isAnimationActive={false} style={{ filter: "drop-shadow(0 0 6px #FF7A7A)" }} />
            <Line type="monotone" dataKey="upper" name="Baseline +2σ" stroke="#9AABC4" strokeDasharray="4 4" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted">Shaded band = preflight baseline ±2σ. Extra dose produces a delayed NDI peak near +72 h.</p>
    </Panel>
  );
}

export function Assistant({ snap }: { snap: CrewSnap }) {
  const [started, setStarted] = useState(false);
  const cl = snap.subject.checklist;
  const toggle = (id: string, done: boolean) => post("/api/control", { action: { id, done } });
  const done = cl.items.filter((i) => i.done).length;
  return (
    <Panel
      title="On-board assistant"
      right={
        <button
          type="button"
          onClick={() => setStarted((s) => !s)}
          className="launch-btn no-print rounded-lg border border-accent/60 bg-accent/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-accent shadow-[0_0_14px_rgba(76,201,240,0.3)] transition-all hover:scale-105 hover:bg-accent/20"
        >
          {started ? `Checklist ${done}/${cl.items.length}` : "Start checklist"}
        </button>
      }
    >
      <ul className="space-y-1.5">
        {cl.items.map((i) => {
          const pc = i.priority === "high" ? "#FF7A7A" : i.priority === "medium" ? "#FFB454" : "#9AABC4";
          return (
            <li
              key={i.id}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm transition-colors hover:border-white/20"
              style={{ boxShadow: i.priority === "high" && !i.done ? `inset 3px 0 0 ${pc}, 0 0 12px ${pc}22` : `inset 3px 0 0 ${pc}` }}
            >
              {started ? (
                <input id={`ck-${i.id}`} type="checkbox" checked={i.done} onChange={(e) => toggle(i.id, e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#4CC9F0]" />
              ) : (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: pc, boxShadow: `0 0 8px ${pc}` }} aria-hidden />
              )}
              <label htmlFor={started ? `ck-${i.id}` : undefined} className={`flex-1 ${i.done ? "text-muted line-through" : ""}`}>
                {i.text}
              </label>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: pc, textShadow: `0 0 8px ${pc}` }}>
                {i.priority}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{cl.disclaimer}</p>
    </Panel>
  );
}

export function SyncQueue({ snap }: { snap: CrewSnap }) {
  const q = snap.queue;
  const up = snap.controls.linkUp;
  return (
    <Panel title="Delay-tolerant sync queue" status={up ? "nominal" : "alert"}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="font-mono text-5xl font-semibold tabular-nums" style={{ color: q.count ? "#FFB454" : "#4CC9F0", textShadow: `0 0 18px ${q.count ? "#FFB454" : "#4CC9F0"}` }}>
            {q.count}
          </p>
          <p className="text-xs text-muted">packets waiting on board</p>
        </div>
        <dl className="space-y-1 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Link</dt>
            <dd className="neon-text font-mono font-semibold" style={{ color: up ? "#5EE0C1" : "#FF7A7A" }}>{up ? "UP" : "LOS"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Next sync</dt>
            <dd className="font-mono">{q.nextSync}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">One-way light time</dt>
            <dd className="font-mono">{snap.controls.delayMin} min</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Ground msgs pending</dt>
            <dd className="font-mono">{q.repliesPending}</dd>
          </div>
        </dl>
      </div>
      <p className="mt-3 text-[11px] text-muted">Digest every 10 min (sim). During LOS all analysis runs on board; packets are stored and forwarded on reconnection.</p>
    </Panel>
  );
}

const LOG_COLOR: Record<string, string> = { info: "#9AABC4", warn: "#FFB454", alert: "#FF7A7A", ground: "#4CC9F0", link: "#A78BFA" };

export function EventLog({ snap }: { snap: CrewSnap }) {
  return (
    <Panel title="Event log">
      <ol className="max-h-72 space-y-1.5 overflow-y-auto pr-1 font-mono text-xs" aria-live="polite">
        {snap.log.map((l, i) => (
          <li key={`${l.ts}-${i}`} className="flex gap-2">
            <span className="text-muted">{simClock(l.ts)}</span>
            <span className="w-12 shrink-0 uppercase" style={{ color: LOG_COLOR[l.kind], textShadow: `0 0 8px ${LOG_COLOR[l.kind]}88` }}>
              {l.kind}
            </span>
            <span className={l.kind === "ground" ? "text-accent" : ""}>{l.text}</span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function ControlBar({ snap }: { snap: CrewSnap }) {
  const c = snap.controls;
  const btn = "launch-btn rounded-xl border px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] transition-all hover:scale-105";
  return (
    <div className="no-print sticky bottom-3 z-20 mt-2">
      <div className="glass glow-nominal rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(7,12,22,0.88)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-accent/80">◆ Demo controls</span>
        <button
          type="button"
          aria-pressed={c.sunEvent}
          onClick={() => post("/api/control", { sunEvent: !c.sunEvent })}
          className={`${btn} ${c.sunEvent ? "glow-alert border-alert bg-alert/15 text-alert" : "border-watch/60 bg-watch/5 text-watch shadow-[0_0_14px_rgba(255,180,84,0.3)] hover:bg-watch/15"}`}
        >
          {c.sunEvent ? "End solar event" : "Trigger solar event"}
        </button>
        <button
          type="button"
          aria-pressed={!c.linkUp}
          onClick={() => post("/api/control", { linkUp: !c.linkUp })}
          className={`${btn} ${c.linkUp ? "border-accent/50 bg-accent/5 text-accent shadow-[0_0_14px_rgba(76,201,240,0.3)] hover:bg-accent/15" : "glow-alert border-alert bg-alert/15 text-alert"}`}
        >
          {c.linkUp ? "Cut link (LOS)" : "Restore link (UP)"}
        </button>
        <div role="group" aria-label="Earth delay" className="flex overflow-hidden rounded-xl border border-white/10 bg-black/20">
          {([0, 3, 12, 22] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={c.delayMin === d}
              onClick={() => post("/api/control", { delayMin: d })}
              className={`px-3.5 py-2.5 font-mono text-xs transition-all ${c.delayMin === d ? "bg-accent/20 text-accent shadow-[inset_0_0_12px_rgba(76,201,240,0.35)]" : "text-muted hover:text-ink"}`}
            >
              {d} min
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-muted">1 real s = 1 simulated min</span>
      </div>
      </div>
    </div>
  );
}

export function SoundToggle({ on, toggle }: { on: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Mute audio telemetry" : "Enable audio telemetry"}
      title={on ? "Audio telemetry on" : "Audio telemetry muted"}
      className={`no-print glass flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-all hover:scale-105 ${
        on ? "text-accent shadow-[0_0_14px_rgba(76,201,240,0.35)]" : "text-muted"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /> : <path d="m22 9-6 6M16 9l6 6" />}
      </svg>
      {on ? "Audio" : "Muted"}
    </button>
  );
}

export function TelemetryTicker({ snap }: { snap: CrewSnap }) {
  const items = snap.crew.flatMap((c) => [
    `${c.id} RISK ${String(c.score).padStart(3, "0")} ${c.status.toUpperCase()}`,
    `NDI ${c.metrics.ndi.toFixed(1)}`,
    `IOP ${c.metrics.iop.toFixed(1)}mmHg`,
    `BBB ${c.metrics.bbb.toFixed(2)}x`,
    `HR ${c.metrics.hr}bpm`,
    `DOSE ${c.metrics.dose.toFixed(1)}uGy/h`,
  ]);
  items.push(`LINK ${snap.controls.linkUp ? "UP" : "LOS"}`, `DELAY ${snap.controls.delayMin}min`, `QUEUE ${snap.queue.count}`, `T+${simClock(snap.simNow)}`);
  const line = items.join("   ◆   ");
  return (
    <div className="no-print glass mt-4 overflow-hidden rounded-xl py-1.5" aria-hidden>
      <div className="marquee font-mono text-[11px] tracking-[0.12em] text-accent/80">
        <span className="px-4">{line}</span>
        <span className="px-4">{line}</span>
      </div>
    </div>
  );
}

