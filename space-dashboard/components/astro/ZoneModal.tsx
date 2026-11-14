"use client";

import { useEffect, useRef } from "react";
import type { Zone } from "@/components/AstronautModel";
import { BASELINE, ewma, vascularAxis, zScore, type MetricKey, type Status } from "@/lib/engine";
import { GLOW, SciTip, Sparkline, STATUS_COLOR, StatusChip, type CrewSnap, type ScienceKey } from "@/components/astro/ui";

const zStatus = (z: number): Status => (z > 3 ? "alert" : z > 2 ? "watch" : "nominal");
const worst = (...s: Status[]): Status => (s.includes("alert") ? "alert" : s.includes("watch") ? "watch" : "nominal");
const sgn = (v: number, d = 1) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(d)}`;

const ZONES: Record<Zone, { code: string; title: string; system: string; metrics: { key: MetricKey; color: string; d: number }[] }> = {
  head: {
    code: "Z-01",
    title: "Head / Eyes",
    system: "Neuro-ocular · SANS & blood-brain barrier",
    metrics: [
      { key: "iop", color: "#4CC9F0", d: 1 },
      { key: "bbb", color: "#A78BFA", d: 2 },
    ],
  },
  chest: {
    code: "Z-02",
    title: "Chest / Heart",
    system: "Cardiovascular · endothelial Notch signaling",
    metrics: [
      { key: "ndi", color: "#FF7A7A", d: 1 },
      { key: "hr", color: "#FFB454", d: 0 },
    ],
  },
  arm: {
    code: "Z-03",
    title: "Arm / Wrist",
    system: "Bio-Monitor wristband · radiation dosimetry",
    metrics: [
      { key: "hr", color: "#FFB454", d: 0 },
      { key: "dose", color: "#5EE0C1", d: 1 },
    ],
  },
};

function derived(zone: Zone, snap: CrewSnap): { label: string; value: string; note: string; status: Status; sci?: ScienceKey }[] {
  const m = snap.subject.metrics;
  const zi = zScore("iop", m.iop);
  const zb = zScore("bbb", m.bbb);
  const zn = zScore("ndi", m.ndi);
  const zh = zScore("hr", m.hr);
  if (zone === "head") {
    const icp = 10 + (m.iop - BASELINE.iop.mean) * 0.85;
    const ktrans = 0.0021 * m.bbb;
    const sans = zi > 3 ? "HIGH" : zi > 2 ? "MODERATE" : "LOW";
    return [
      { label: "Intracranial pressure (est.)", value: `${icp.toFixed(1)} mmHg`, note: "derived from IOP coupling", status: zStatus(zi) },
      { label: "Kᴛʀᴀɴs leakage index", value: `${ktrans.toFixed(4)} min⁻¹`, note: "DCE-MRI equivalent", status: zStatus(zb), sci: "bbb" },
      { label: "SANS optic disc risk", value: sans, note: "Spaceflight-associated neuro-ocular syndrome", status: zStatus(zi), sci: "iop" },
      { label: "Cognitive load flag", value: zb > 2 ? "RUN BATTERY" : "CLEAR", note: "BBB-linked", status: zStatus(zb) },
    ];
  }
  if (zone === "chest") {
    const { jag2, notch4, fmd, integrity } = vascularAxis(m.ndi);
    return [
      { label: "Jag2 expression", value: `${jag2.toFixed(2)}× preflight`, note: "ligand upregulation", status: zStatus(zn), sci: "jag2" },
      { label: "Notch4 receptor activity", value: `${(notch4 * 100).toFixed(0)}%`, note: "endothelial axis", status: zStatus(zn), sci: "notch4" },
      { label: "Flow-mediated dilation", value: `${fmd.toFixed(1)} %`, note: "vascular reactivity", status: zStatus(zn) },
      { label: "Endothelial integrity", value: `${integrity.toFixed(0)} / 100`, note: "composite", status: zStatus(zn) },
    ];
  }
  const live = snap.subject.live.dose;
  const cum = live.reduce((s, v) => s + v / 60, 0);
  const hrv = Math.max(12, 58 - Math.max(0, zh) * 9);
  return [
    { label: "Dose, last 2 h (sim)", value: `${cum.toFixed(1)} µGy`, note: "integrated from dose rate", status: zStatus(zScore("dose", m.dose)) },
    { label: "Heart-rate variability", value: `${hrv.toFixed(0)} ms RMSSD`, note: "autonomic stress", status: zStatus(zh) },
    { label: "Skin temperature", value: `${(33.4 + zh * 0.15).toFixed(1)} °C`, note: "wrist sensor", status: "nominal" },
    { label: "Sensor contact", value: "LOCKED", note: "signal quality 98%", status: "nominal" },
  ];
}

export default function ZoneModal({ zone, snap, onClose }: { zone: Zone; snap: CrewSnap; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cfg = ZONES[zone];
  const m = snap.subject.metrics;
  const st = worst(...cfg.metrics.map((x) => zStatus(zScore(x.key, m[x.key]))));
  const rows = derived(zone, snap);
  const contrib = snap.subject.risk.contributions.filter((c) => cfg.metrics.some((x) => x.key === c.key));

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="zone-title"
        onClick={(e) => e.stopPropagation()}
        className={`glass ${GLOW[st]} relative w-full max-w-2xl rounded-2xl p-6 outline-none animate-[zoom-in_.18s_ease-out]`}
      >
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
              {cfg.code} · {snap.subject.id} {snap.subject.name}
            </p>
            <h2 id="zone-title" className="mt-1 text-2xl font-bold">
              {cfg.title}
            </h2>
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">{cfg.system}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusChip status={st} size="lg" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close zone details"
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-muted transition-colors hover:border-accent/60 hover:text-accent"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {cfg.metrics.map((x) => {
            const b = BASELINE[x.key];
            const v = m[x.key];
            const z = zScore(x.key, v);
            const series = snap.subject.live[x.key];
            const trend = ewma(series, 0.15);
            const slope = trend.length > 10 ? trend[trend.length - 1] - trend[trend.length - 11] : 0;
            return (
              <div key={x.key} className={`glass ${GLOW[zStatus(z)]} rounded-xl p-4`}>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{b.label}</p>
                  <StatusChip status={zStatus(z)} />
                </div>
                <p className="mt-2 font-mono text-3xl font-semibold tabular-nums" style={{ color: x.color, textShadow: `0 0 14px ${x.color}88` }}>
                  {v.toFixed(x.d)} <span className="text-xs text-muted">{b.unit}</span>
                </p>
                <div className="mt-2">
                  <Sparkline values={series} color={x.color} height={44} band={[b.mean - 2 * b.std, b.mean + 2 * b.std]} />
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 font-mono text-[10px]">
                  <div>
                    <dt className="text-muted">z-score</dt>
                    <dd style={{ color: STATUS_COLOR[zStatus(z)] }}>{sgn(z)}σ</dd>
                  </div>
                  <div>
                    <dt className="text-muted">baseline</dt>
                    <dd>
                      {b.mean} ± {b.std}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">EWMA 10 min</dt>
                    <dd>
                      {slope >= 0 ? "▲" : "▼"} {sgn(slope, x.d === 0 ? 0 : 2)}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full font-mono text-xs">
            <caption className="bg-white/[0.03] px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-accent/80">Deep telemetry</caption>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-white/5">
                  <th scope="row" className="px-3 py-2 text-left font-normal text-muted">
                    <span className="inline-flex items-center gap-2">
                      {r.label}
                      {r.sci && <SciTip k={r.sci} />}
                    </span>
                    <span className="block text-[9px] uppercase tracking-[0.12em] text-muted/60">{r.note}</span>
                  </th>
                  <td className="px-3 py-2 text-right tabular-nums" style={{ color: STATUS_COLOR[r.status], textShadow: r.status !== "nominal" ? `0 0 8px ${STATUS_COLOR[r.status]}` : undefined }}>
                    {r.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {contrib.length > 0 && (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            Share of crew risk score:{" "}
            {contrib.map((c) => (
              <span key={c.key} className="ml-2 text-accent">
                {c.key.toUpperCase()} {Math.round(c.share * 100)}%
              </span>
            ))}
          </p>
        )}
        <p className="mt-2 text-[10px] text-muted/80">Derived values are synthetic estimates for the demo. Decision support, not a diagnosis.</p>
      </div>
    </div>
  );
}
