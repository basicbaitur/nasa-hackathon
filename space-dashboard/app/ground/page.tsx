"use client";

import { useState } from "react";
import { CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BASELINE } from "@/lib/engine";
import type { groundSnapshot } from "@/lib/store";
import DeepSpaceLink from "@/components/astro/DeepSpaceLink";
import { Chip, DemoLabel, Panel, Sparkline, STATUS_COLOR, StatusChip, TopBar, post, simClock, usePoll } from "@/components/astro/ui";

type Ground = ReturnType<typeof groundSnapshot>;
const DAY = 86_400_000;

const EVENT_COLOR: Record<string, string> = { solar: "#FFB454", los: "#FF7A7A", aos: "#5EE0C1", note: "#9AABC4" };

function HistoryChart({ g }: { g: Ground }) {
  const now = g.simNow;
  const data = g.selected.history.map((p) => ({ d: (p.ts - now) / DAY, ndi: p.ndi }));
  const x0 = data[0]?.d ?? -14;
  const events = g.selected.events.map((e) => ({ ...e, d: (e.ts - now) / DAY })).filter((e) => e.d >= x0);
  const b = BASELINE.ndi;
  return (
    <div className="h-64 print:h-44">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 18, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <XAxis
            dataKey="d"
            type="number"
            domain={[Math.floor(x0), 0]}
            ticks={Array.from({ length: 15 }, (_, i) => -14 + i)}
            tickFormatter={(d) => (d === 0 ? "now" : `D${d}`)}
            tick={{ fill: "#9AABC4", fontSize: 10 }}
            stroke="#22314D"
          />
          <YAxis tick={{ fill: "#9AABC4", fontSize: 10 }} stroke="#22314D" domain={[0, (max: number) => Math.max(40, Math.ceil(max / 10) * 10)]} />
          <ReferenceArea y1={b.mean - 2 * b.std} y2={b.mean + 2 * b.std} fill="#5EE0C1" fillOpacity={0.08} />
          <ReferenceLine y={b.mean} stroke="#5EE0C1" strokeDasharray="4 4" strokeOpacity={0.6} />
          {events.map((e, i) => (
            <ReferenceLine
              key={`${e.ts}-${i}`}
              x={e.d}
              stroke={EVENT_COLOR[e.type]}
              strokeDasharray="2 3"
              label={{ value: e.type === "solar" ? "☀ SPE" : e.type.toUpperCase(), position: "top", fill: EVENT_COLOR[e.type], fontSize: 10 }}
            />
          ))}
          <Tooltip
            contentStyle={{ background: "rgba(10,15,26,0.9)", border: "1px solid rgba(76,201,240,0.4)", borderRadius: 8, fontSize: 12 }}
            labelFormatter={(d) => `${Number(d).toFixed(2)} d`}
            formatter={(v) => [Number(v).toFixed(1), "NDI"]}
          />
          <Line type="monotone" dataKey="ndi" stroke="#FF7A7A" dot={false} strokeWidth={1.8} isAnimationActive={false} style={{ filter: "drop-shadow(0 0 4px #FF7A7A)" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReplyBox({ crewId, g }: { crewId: string; g: Ground }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    await post("/api/ground/reply", { crewId, text: text.trim() });
    setText("");
    setSending(false);
  };
  return (
    <Panel title={`Reply to ${crewId}`} className="no-print">
      <form onSubmit={send} className="flex flex-wrap gap-2">
        <label htmlFor="reply" className="sr-only">
          Message to {crewId}
        </label>
        <input
          id="reply"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Copy. Proceed to storm shelter, repeat IOP at T+2h."
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm placeholder:text-muted/60 focus:border-accent/60 focus:shadow-[0_0_14px_rgba(76,201,240,0.3)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="launch-btn rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-white shadow-[0_0_16px_rgba(76,201,240,0.5)] transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
        >
          Send
        </button>
      </form>
      <ul className="mt-3 space-y-1 text-xs">
        {g.replies.map((r) => (
          <li key={r.id} className="flex justify-between gap-2">
            <span className="truncate">
              <span className="font-mono text-muted">{r.crewId}</span> {r.text}
            </span>
            <span className={`neon-text shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] ${r.delivered ? "text-nominal" : r.deliverAt ? "text-watch" : "animate-pulse text-alert"}`}>
              {r.delivered ? "Delivered" : r.deliverAt ? "In transit" : "Waiting for link"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted">Uplink travels at the same one-way light time; held on the ground during LOS.</p>
    </Panel>
  );
}

export default function GroundPage() {
  const [sel, setSel] = useState("CM-3");
  const g = usePoll<Ground>(`/api/ground?crewId=${sel}`, 1000);

  if (!g)
    return (
      <main className="grid min-h-screen place-items-center text-muted">
        <p>Waiting for downlink…</p>
      </main>
    );

  const age = g.lastPacketAgoMin;
  const ageTone = age === null || age > 15 ? "#FF7A7A" : age > 10 ? "#FFB454" : "#5EE0C1";
  const d = g.latestDigest;
  const selRow = g.crew.find((c) => c.id === sel);

  return (
    <main className="mx-auto w-full max-w-[1560px] flex-1 px-4 py-5 lg:px-8 print:p-0">
      <TopBar view="ground">
        <Chip label="Last packet" value={age === null ? "none yet" : `${age} min ago`} tone={ageTone} />
        <Chip label="In transit" value={String(g.inTransit)} />
        <Chip label="Sim" value={simClock(g.simNow)} />
        <button
          type="button"
          onClick={() => window.print()}
          className="launch-btn no-print rounded-lg bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_0_18px_rgba(76,201,240,0.55)] transition-all hover:scale-105"
        >
          Export report
        </button>
      </TopBar>

      {age !== null && age > 15 && (
        <div role="status" className="no-print glass glow-watch mt-4 rounded-xl px-5 py-3 font-mono text-sm uppercase tracking-[0.1em] text-watch">
          No downlink for {age} min. Crew is operating autonomously; data shown is the last received state.
        </div>
      )}

      <div className="print-compact mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel title="Crew status (last received digest)" className="lg:col-span-7" status={g.crew.some((c) => c.status === "alert") ? "alert" : g.crew.some((c) => c.status === "watch") ? "watch" : "nominal"}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  <th className="py-1.5 font-medium">Crew</th>
                  <th className="py-1.5 font-medium">Score</th>
                  <th className="py-1.5 font-medium">Status</th>
                  <th className="py-1.5 font-medium">Risk · 72 h</th>
                  <th className="py-1.5 font-medium">Last digest</th>
                </tr>
              </thead>
              <tbody>
                {g.crew.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-t border-white/5 transition-colors hover:bg-white/[0.03] ${c.id === sel ? "bg-accent/[0.07] shadow-[inset_3px_0_0_#4CC9F0]" : ""} ${c.status === "alert" ? "bg-alert/[0.05]" : ""}`}
                  >
                    <td className="py-3">
                      <button type="button" onClick={() => setSel(c.id)} aria-pressed={c.id === sel} className="pl-2 text-left transition-colors hover:text-accent">
                        <span className="font-mono">{c.id}</span> <span className="text-xs text-muted">{c.name}</span>
                      </button>
                    </td>
                    <td className="py-3 font-mono text-lg tabular-nums" style={{ color: STATUS_COLOR[c.status], textShadow: `0 0 10px ${STATUS_COLOR[c.status]}` }}>
                      {c.score}
                    </td>
                    <td className="py-3">
                      <StatusChip status={c.status} />
                    </td>
                    <td className="w-40 py-2">
                      <Sparkline values={c.spark72h} color={STATUS_COLOR[c.status]} height={26} />
                    </td>
                    <td className="py-3 font-mono text-xs text-muted">{c.lastDigestTs ? simClock(c.lastDigestTs) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Latest digest" className="lg:col-span-5" status={d?.status} right={d ? <StatusChip status={d.status} /> : undefined}>
          {d ? (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <dt className="text-muted">Packet</dt>
                <dd className="font-mono">
                  {d.id} · {d.crewId}
                </dd>
                <dt className="text-muted">Created (crew time)</dt>
                <dd className="font-mono">
                  {simClock(d.ts)}
                  {d.queuedWhileLOS ? " · stored during LOS" : ""}
                </dd>
                <dt className="text-muted">Risk score</dt>
                <dd className="font-mono text-base" style={{ color: STATUS_COLOR[d.status], textShadow: `0 0 10px ${STATUS_COLOR[d.status]}` }}>
                  {d.score} / 100
                </dd>
                <dt className="text-muted">IOP · BBB</dt>
                <dd className="font-mono">
                  {d.metrics.iop} mmHg · {d.metrics.bbb}×
                </dd>
                <dt className="text-muted">NDI · HR</dt>
                <dd className="font-mono">
                  {d.metrics.ndi} · {d.metrics.hr} bpm
                </dd>
                <dt className="text-muted">Dose rate</dt>
                <dd className="font-mono">{d.metrics.dose} µGy/h</dd>
                <dt className="text-muted">Actions taken</dt>
                <dd>{d.actionsTaken.length ? d.actionsTaken.join(", ") : "—"}</dd>
              </dl>
              <h3 className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-accent/80">Inbox</h3>
              <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto font-mono text-[11px]">
                {g.inbox.slice(0, 12).map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span>
                      {simClock(p.ts)} {p.id} {p.crewId}
                    </span>
                    <span style={{ color: STATUS_COLOR[p.status] }}>
                      {p.score} {p.status}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted">No digest received yet.</p>
          )}
        </Panel>

        <Panel
          title={`${g.selected.id} ${g.selected.name} · NDI, 14 days vs baseline band`}
          className="lg:col-span-8 print:col-span-12"
          status={selRow?.status}
          right={selRow ? <StatusChip status={selRow.status} /> : undefined}
        >
          <HistoryChart g={g} />
          <p className="mt-1 text-[11px] text-muted">Band = preflight baseline ±2σ. Markers: ☀ solar particle events, LOS/AOS link changes.</p>
        </Panel>

        <div className="lg:col-span-4">
          <ReplyBox crewId={sel} g={g} />
        </div>

        <Panel title="Deep-space link · Mars ⇄ Earth" className="no-print lg:col-span-12" status={g.link.linkUp ? "nominal" : "alert"}>
          <DeepSpaceLink link={g.link} height={200} />
        </Panel>
      </div>

      <div className="py-6">
        <DemoLabel />
        <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-muted/80">Decision support, not a diagnosis. A human crew medical officer confirms every action.</p>
      </div>
    </main>
  );
}
