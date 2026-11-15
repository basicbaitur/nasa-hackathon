"use client";

import { useState } from "react";
import AstronautModel, { type Zone } from "@/components/AstronautModel";
import Copilot from "@/components/astro/Copilot";
import ZoneModal from "@/components/astro/ZoneModal";
import DeepSpaceLink from "@/components/astro/DeepSpaceLink";
import { useAudioTelemetry, useSoundPref } from "@/components/astro/audio";
import { statusOf, zScore, type MetricKey } from "@/lib/engine";
import { Chip, DemoLabel, GLOW, Panel, SciTip, STATUS_COLOR, STATUS_LABEL, TopBar, simClock, useCrewStream } from "@/components/astro/ui";
import { Assistant, ControlBar, Contributions, EventLog, Gauge, SoundToggle, SyncQueue, TelemetryTicker, VascularAxis, VitalCard, VITALS, WhatIf, worst, zStatus } from "@/components/astro/CrewWidgets";

export default function ClassicCrewPage() {
  const { snap, connected } = useCrewStream();
  const [zone, setZone] = useState<Zone | null>(null);
  const sound = useSoundPref();
  useAudioTelemetry(snap?.subject.risk.status, sound.on);

  if (!snap)
    return (
      <main className="grid min-h-screen place-items-center text-muted">
        <p>Connecting to on-board engine…</p>
      </main>
    );

  const m = snap.subject.metrics;
  const zs = (k: MetricKey) => zStatus(zScore(k, m[k]));
  const statuses = { head: worst(zs("iop"), zs("bbb")), chest: zs("ndi"), arm: worst(zs("hr"), zs("dose")) };
  const risk = snap.subject.risk;
  const up = snap.controls.linkUp;

  return (
    <main className="mx-auto w-full max-w-[1560px] flex-1 px-4 pt-5 lg:px-8">
      <TopBar view="crew">
        <Chip label="Mission" value="ARES-IV · Mars transit" />
        <Chip label="Subject" value={`${snap.subject.id} ${snap.subject.name}`} />
        <Chip label="Light time" value={`${snap.controls.delayMin} min · RTT ${snap.controls.delayMin * 2}`} />
        <Chip label="Link" value={up ? "UP" : "LOS"} tone={up ? "#5EE0C1" : "#FF7A7A"} />
        <Chip label="Sim" value={`${simClock(snap.simNow)}${connected ? "" : " · reconnecting"}`} />
        <SoundToggle on={sound.on} toggle={sound.toggle} />
      </TopBar>
      <TelemetryTicker snap={snap} />

      {!up && (
        <div role="status" className="glass glow-alert mt-4 rounded-xl px-5 py-3 font-mono text-sm uppercase tracking-[0.1em] text-alert">
          LOS: Earth link lost. On-board engine continues autonomously; {snap.queue.count} digest packets queued.
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel title="Crew risk score" className="lg:col-span-4" status={risk.status}>
          <Gauge score={risk.score} status={risk.status} />
        </Panel>
        <Panel title="Why this score · factor contributions" className="lg:col-span-5" right={<SciTip k="risk" side="left" />}>
          <Contributions risk={risk} />
          <VascularAxis ndi={m.ndi} bbb={m.bbb} />
          <p className="mt-3 text-[11px] text-muted">Weighted sum of z-scores vs preflight baseline (clamped 0–4σ): NDI 40%, dose 25%, IOP 20%, BBB 15%.</p>
        </Panel>
        <Panel title="Digital twin" className="lg:col-span-3" right={<span className="font-mono text-[9px] uppercase tracking-[0.18em] text-accent/70">Click a zone</span>}>
          <div className="mx-auto max-w-[220px]">
            <AstronautModel selectedZone={zone} onZoneSelect={setZone} statuses={statuses} heartRate={m.hr} />
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
            {snap.crew.map((c) => (
              <li key={c.id} className={`glass ${GLOW[c.status]} flex items-center justify-between gap-1 rounded-lg px-2 py-1`}>
                <span className="font-mono">{c.id}</span>
                <span style={{ color: STATUS_COLOR[c.status] }}>
                  {c.score} {STATUS_LABEL[c.status]}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
        {VITALS.map((v, i) => (
          <VitalCard key={v.key} k={v} snap={snap} tipSide={i >= 3 ? "left" : "right"} />
        ))}
      </div>

      <div className="mt-6">
        <Panel
          title="Deep-space link · live light-time channel"
          status={snap.controls.linkUp ? "nominal" : "alert"}
          right={<span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">● digest ↗ earth · ◆ ground reply ↙ mars · ○ buffered</span>}
        >
          <DeepSpaceLink link={snap.link} />
        </Panel>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WhatIf ndi={m.ndi} />
        <Assistant snap={snap} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <SyncQueue snap={snap} />
        </div>
        <div className="lg:col-span-5">
          <Copilot snap={snap} />
        </div>
        <div className="lg:col-span-4">
          <EventLog snap={snap} />
        </div>
      </div>

      <div className="py-6">
        <DemoLabel />
        <p className="sr-only">Overall status {statusOf(risk.score)}</p>
      </div>
      <ControlBar snap={snap} />
      {zone && <ZoneModal zone={zone} snap={snap} onClose={() => setZone(null)} />}
    </main>
  );
}
