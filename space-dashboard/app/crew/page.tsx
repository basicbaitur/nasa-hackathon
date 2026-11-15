"use client";

import "./helmet.css";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AstronautModel, { type Zone } from "@/components/AstronautModel";
import Copilot from "@/components/astro/Copilot";
import DeepSpaceLink from "@/components/astro/DeepSpaceLink";
import ZoneModal from "@/components/astro/ZoneModal";
import { blip, breathe, useAudioTelemetry, useSoundPref } from "@/components/astro/audio";
import { Assistant, Contributions, EventLog, Gauge, SyncQueue, VascularAxis, WhatIf, worst, zStatus } from "@/components/astro/CrewWidgets";
import { Logo, post, simClock, STATUS_COLOR, STATUS_LABEL, useCrewStream, type CrewSnap } from "@/components/astro/ui";
import Boot from "@/components/helmet/Boot";
import { HelmetShell, VisorGlass } from "@/components/helmet/HelmetFrame";
import { BioRow, Dock, Dosimeter, Ecg, HeadingTape, HoloWindow, HUD, HudBlock, MODULES, Reticle, RiskRing, SuitRow, type ModuleKey } from "@/components/helmet/Hud";
import { useLook } from "@/components/helmet/look";
import SpaceView from "@/components/helmet/SpaceView";
import { zScore, type MetricKey, type Status } from "@/lib/engine";
import { suitTelemetry } from "@/lib/suit";

const MODULE_TITLE: Record<ModuleKey, { title: string; code: string; wide?: boolean }> = {
  twin: { title: "Digital twin · click a zone", code: "M1" },
  risk: { title: "Why this score · explainable risk", code: "M2", wide: true },
  link: { title: "Deep-space link · live light-time channel", code: "M3", wide: true },
  forecast: { title: "What-if · 72 h NDI forecast", code: "M4", wide: true },
  checklist: { title: "On-board assistant · checklist", code: "M5" },
  copilot: { title: "AI medical copilot", code: "M6" },
  log: { title: "Event log", code: "M7" },
};

const LOG_COLOR: Record<string, string> = { info: "#9AABC4", warn: "#FFB454", alert: "#FF7A7A", ground: HUD, link: "#A78BFA" };

function fmtMin(m: number) {
  const h = Math.floor(m / 60);
  return `${h}h ${String(Math.round(m % 60)).padStart(2, "0")}m`;
}

function IconBtn({ label, onClick, on, children }: { label: string; onClick: () => void; on?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={on} className={`dock-btn !px-2 ${on ? "dock-btn-on" : ""}`}>
      {children}
    </button>
  );
}

function LinkModule({ snap }: { snap: CrewSnap }) {
  const c = snap.controls;
  return (
    <div className="space-y-4">
      <DeepSpaceLink link={snap.link} height={220} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => post("/api/control", { linkUp: !c.linkUp })} className={`dock-btn ${c.linkUp ? "" : "dock-btn-alert"}`} aria-pressed={!c.linkUp}>
          {c.linkUp ? "Cut link (LOS)" : "Restore link (UP)"}
        </button>
        <div role="group" aria-label="One-way light time" className="flex gap-1">
          {([0, 3, 12, 22] as const).map((d) => (
            <button key={d} type="button" aria-pressed={c.delayMin === d} onClick={() => post("/api/control", { delayMin: d })} className={`dock-btn ${c.delayMin === d ? "dock-btn-on" : ""}`}>
              {d} min
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--hud-dim)]">● digest ↗ earth · ◆ reply ↙ mars · ○ buffered</span>
      </div>
      <SyncQueue snap={snap} />
    </div>
  );
}

export default function HelmetCrewPage() {
  const { snap, connected } = useCrewStream();
  const root = useRef<HTMLElement>(null);
  const [mod, setMod] = useState<ModuleKey | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [booting, setBooting] = useState(true);
  const [glitch, setGlitch] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const sound = useSoundPref();
  const status: Status = snap?.subject.risk.status ?? "nominal";
  useAudioTelemetry(snap ? status : undefined, sound.on);

  const suit = snap ? suitTelemetry(snap.tick, snap.subject.metrics.hr, snap.controls.sunEvent) : null;
  const resp = suit?.respRate ?? 14;
  useLook(root, resp);

  // Breathing inside the helmet.
  useEffect(() => {
    if (!sound.on || booting) return;
    const period = 60 / resp;
    breathe(period, 0.03);
    const id = setInterval(() => breathe(period, 0.03), period * 1000);
    return () => clearInterval(id);
  }, [sound.on, resp, booting]);

  // HUD glitch when the status worsens.
  const prevStatus = useRef<Status>("nominal");
  useEffect(() => {
    const rank = { nominal: 0, watch: 1, alert: 2 };
    if (rank[status] > rank[prevStatus.current]) {
      setGlitch(true);
      const t = setTimeout(() => setGlitch(false), 650);
      prevStatus.current = status;
      return () => clearTimeout(t);
    }
    prevStatus.current = status;
  }, [status]);

  const pick = useCallback((k: ModuleKey) => {
    blip(1500, 0.02, 0.05);
    setMod((m) => (m === k ? null : k));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);
  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  // Keyboard: 1–7 modules, Esc closes, F fullscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") setMod(null);
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
      else {
        const m = MODULES.find((x) => x.hint === e.key);
        if (m) pick(m.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pick, toggleFullscreen]);

  const endBoot = useCallback(() => setBooting(false), []);

  const m = snap?.subject.metrics;
  const zs = (k: MetricKey) => (m ? zStatus(zScore(k, m[k])) : "nominal");
  const statuses = { head: worst(zs("iop"), zs("bbb")), chest: zs("ndi"), arm: worst(zs("hr"), zs("dose")) };
  const up = snap?.controls.linkUp ?? true;
  const sun = snap?.controls.sunEvent ?? false;
  const suitStatus = suit ? suit.readings.reduce<Status>((w, r) => worst(w, r.status), "nominal") : "nominal";
  const pending = snap?.subject.checklist.items.filter((i) => !i.done) ?? [];
  const next = status !== "nominal" || sun ? (pending.find((i) => i.priority === "high") ?? pending[0]) : undefined;
  const statusColor = status === "nominal" ? HUD : STATUS_COLOR[status];

  return (
    <main ref={root} className={`helmet ${glitch ? "hud-glitch" : ""} ${booting ? "is-booting" : ""}`} data-status={status}>
      {/* 1 · outside the visor */}
      <div className="layer-world">
        <SpaceView sunEvent={sun} linkUp={up} delayMin={snap?.controls.delayMin ?? 12} />
      </div>

      {/* 2 · glass */}
      <VisorGlass status={status} los={!up} />

      {/* 3 · HUD projected on the visor */}
      <div className={`layer-hud ${mod ? "hud-busy" : ""}`}>
        {/* Header */}
        <header className="hud-header hud-in" style={{ animationDelay: "80ms" }}>
          <Link href="/" aria-label="AstroSentinel home" className="pointer-events-auto flex items-center gap-2.5">
            <Logo size={30} />
            <span className="hidden font-display text-[13px] font-bold tracking-[0.18em] text-[var(--hud)] xl:inline">ASTROSENTINEL</span>
          </Link>
          <div className="flex flex-col items-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-[var(--hud-dim)]">ARES-IV · Mars transit · EVA-2</p>
            <p className="font-mono text-[22px] font-semibold leading-tight tracking-[0.12em] text-[var(--hud)] [text-shadow:0_0_14px_var(--hud)]">
              MET {snap ? simClock(snap.simNow) : "--:--"}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--hud-dim)]">
              {snap ? `${snap.subject.id} · ${snap.subject.name}` : "acquiring biomed link"}
              {snap && !connected && <span className="hud-blink ml-2 text-[#FFB454]">· reconnecting</span>}
            </p>
          </div>
          <div className="pointer-events-auto flex items-center gap-1.5">
            <span className="hidden items-center gap-1.5 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] xl:flex" style={{ color: up ? "#5EE0C1" : "#FF7A7A" }}>
              <span className={`h-1.5 w-1.5 rounded-full ${up ? "" : "hud-blink"}`} style={{ background: "currentColor", boxShadow: "0 0 8px currentColor" }} />
              {up ? "LINK UP" : "LOS"}
            </span>
            <IconBtn label={sound.on ? "Mute helmet audio" : "Enable helmet audio"} onClick={sound.toggle} on={sound.on}>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                {sound.on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /> : <path d="m22 9-6 6M16 9l6 6" />}
              </svg>
            </IconBtn>
            <IconBtn label={fullscreen ? "Exit full screen (F)" : "Full screen (F)"} onClick={toggleFullscreen} on={fullscreen}>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
            </IconBtn>
            <Link href="/ground" className="dock-btn">Ground</Link>
            <Link href="/crew/classic" className="dock-btn max-xl:!hidden">Classic</Link>
          </div>
        </header>
        <div className="hud-heading hud-in" style={{ animationDelay: "160ms" }}>
          <HeadingTape />
        </div>

        {!snap || !suit || !m ? (
          <p className="hud-connecting font-mono text-xs uppercase tracking-[0.3em] text-[var(--hud)]">
            <span className="hud-blink">▮</span> Connecting to on-board engine…
          </p>
        ) : (
          <>
            {/* Left · bio-monitor */}
            <div className="hud-col hud-col-left">
              <HudBlock code="B1" title="Cardiac" delay={250} status={zs("hr")} right={<span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--hud-dim)]">resp {resp}/min</span>}>
                <div className="flex items-end justify-between">
                  <p className="font-mono text-[34px] font-semibold leading-none tabular-nums" style={{ color: statusColor, textShadow: `0 0 14px ${statusColor}` }}>
                    {Math.round(m.hr)}
                    <span className="ml-1 text-[10px] font-normal text-[var(--hud-dim)]">BPM</span>
                  </p>
                  <svg viewBox="0 0 24 24" className="heart-beat h-6 w-6" style={{ animationDuration: `${60 / Math.max(30, m.hr)}s`, color: statusColor }} fill="currentColor" aria-hidden>
                    <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3.1 4.5 6.8 4.5c2 0 3.6 1.1 5.2 3 1.6-1.9 3.2-3 5.2-3 3.7 0 5.9 3.8 4.4 7.2C19.5 16.4 12 21 12 21z" />
                  </svg>
                </div>
                <div className="mt-2">
                  <Ecg hr={m.hr} status={zs("hr")} />
                </div>
              </HudBlock>
              <HudBlock code="B2" title="Crew risk" delay={340} status={status}>
                <RiskRing score={snap.subject.risk.score} status={status} onOpen={() => pick("risk")} />
              </HudBlock>
              <HudBlock code="B3" title="Neuro-vascular" delay={430} status={worst(zs("ndi"), zs("iop"), zs("bbb"))} right={<span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[var(--hud-dim)]">tap for twin</span>}>
                <div className="space-y-2.5">
                  <BioRow k="ndi" label="Notch NDI" value={m.ndi} digits={1} onOpen={() => setZone("chest")} />
                  <BioRow k="iop" label="IOP" value={m.iop} digits={1} onOpen={() => setZone("head")} />
                  <BioRow k="bbb" label="BBB perm." value={m.bbb} digits={2} onOpen={() => setZone("head")} />
                </div>
              </HudBlock>
            </div>

            {/* Right · life support + radiation */}
            <div className="hud-col hud-col-right">
              <HudBlock
                code="L1"
                title="Life support · PLSS"
                delay={300}
                status={suitStatus}
                right={<span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--hud-dim)]">O₂ {fmtMin(suit.o2Min)}</span>}
              >
                <div className="space-y-1.5">
                  {suit.readings.map((r) => (
                    <SuitRow key={r.key} r={r} />
                  ))}
                </div>
              </HudBlock>
              <HudBlock code="L2" title="Radiation" delay={390} status={zs("dose")} right={<button type="button" onClick={() => pick("forecast")} className="hud-link">72 h forecast ▸</button>}>
                <Dosimeter series={snap.subject.live.dose} value={m.dose} sunEvent={sun} />
              </HudBlock>
              {sun && (
                <HudBlock code="L4" title="SDO solar feed" delay={0} status="watch" right={<span className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-[var(--hud-dim)]">NASA/SDO archive</span>}>
                  <video
                    src="/space/sdo-flare.mp4"
                    poster="/space/sdo-flare.jpg"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    className="sdo-video block aspect-video w-full object-cover"
                    aria-label="NASA Solar Dynamics Observatory footage of a solar flare"
                  />
                </HudBlock>
              )}
              <HudBlock code="L3" title="Comms · Earth" delay={480} status={up ? "nominal" : "alert"} right={<button type="button" onClick={() => pick("link")} className="hud-link">channel ▸</button>}>
                <dl className="grid grid-cols-3 gap-2 font-mono">
                  <div>
                    <dt className="text-[8.5px] uppercase tracking-[0.2em] text-[var(--hud-dim)]">Link</dt>
                    <dd className="text-[15px] font-semibold" style={{ color: up ? "#5EE0C1" : "#FF7A7A" }}>{up ? "UP" : "LOS"}</dd>
                  </div>
                  <div>
                    <dt className="text-[8.5px] uppercase tracking-[0.2em] text-[var(--hud-dim)]">Light t.</dt>
                    <dd className="text-[15px] font-semibold text-[var(--hud)]">{snap.controls.delayMin}m</dd>
                  </div>
                  <div>
                    <dt className="text-[8.5px] uppercase tracking-[0.2em] text-[var(--hud-dim)]">Queue</dt>
                    <dd className="text-[15px] font-semibold" style={{ color: snap.queue.count ? "#FFB454" : HUD }}>{snap.queue.count}</dd>
                  </div>
                </dl>
              </HudBlock>
            </div>

            {/* Centre · reticle, alarms, next action */}
            <div className="hud-center" aria-live="polite">
              <div className="hud-alerts">
                {status === "alert" && (
                  <p className="hud-alarm" role="alert">
                    ⚠ Master alarm · crew risk {snap.subject.risk.score}
                  </p>
                )}
                {sun && <p className="hud-alarm hud-alarm-watch">☢ Solar particle event · seek storm shelter</p>}
                {!up && <p className="hud-alarm hud-alarm-los">◌ Loss of signal · autonomous mode · {snap.queue.count} queued</p>}
              </div>
              <Reticle status={status} />
              {next && (
                <button type="button" onClick={() => pick("checklist")} className="hud-next pointer-events-auto">
                  <span className="text-[var(--hud-dim)]">Next ▸</span> {next.text}
                </button>
              )}
            </div>

            {/* Bottom-left · event feed */}
            <ol className="hud-feed hud-in" style={{ animationDelay: "560ms" }} aria-label="Latest events">
              {snap.log.slice(0, 4).map((l, i) => (
                <li key={`${l.ts}-${l.text}`} className="truncate" style={{ opacity: 1 - i * 0.22 }}>
                  <span className="text-[var(--hud-dim)]">{simClock(l.ts)}</span>{" "}
                  <span style={{ color: LOG_COLOR[l.kind] }}>{l.kind.toUpperCase()}</span> {l.text}
                </li>
              ))}
            </ol>

            {/* Bottom · module dock + sim controls */}
            <div className="hud-dock">
              <Dock
                active={mod}
                onPick={pick}
                badges={{
                  checklist: pending.length ? String(pending.length) : "",
                  risk: status !== "nominal" ? "!" : "",
                  link: !up ? "LOS" : "",
                }}
              />
              <div className="hud-in mt-2 flex items-center justify-center gap-1.5" style={{ animationDelay: "720ms" }}>
                <span className="font-mono text-[8.5px] uppercase tracking-[0.3em] text-[var(--hud-dim)]">Sim</span>
                <button type="button" aria-pressed={sun} onClick={() => post("/api/control", { sunEvent: !sun })} className={`dock-btn ${sun ? "dock-btn-alert" : "dock-btn-watch"}`}>
                  {sun ? "End solar event" : "☀ Solar event"}
                </button>
                <button type="button" aria-pressed={!up} onClick={() => post("/api/control", { linkUp: !up })} className={`dock-btn ${up ? "" : "dock-btn-alert"}`}>
                  {up ? "Cut link" : "Restore link"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 4 · helmet shell */}
      <HelmetShell status={status} linkUp={up} />

      {/* 5 · holographic modules */}
      {snap && m && (
        <div className={`holo-layer ${mod ? "" : "holo-hidden"}`} onClick={(e) => e.target === e.currentTarget && setMod(null)}>
          {mod && mod !== "copilot" && (
            <HoloWindow key={mod} {...MODULE_TITLE[mod]} onClose={() => setMod(null)}>
              {mod === "twin" && (
                <div className="grid items-center gap-5 sm:grid-cols-[220px_1fr]">
                  <AstronautModel selectedZone={zone} onZoneSelect={setZone} statuses={statuses} heartRate={m.hr} />
                  <ul className="space-y-1.5">
                    {snap.crew.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2 border-b border-[rgba(127,227,255,0.12)] pb-1.5 font-mono text-xs">
                        <span className={c.id === snap.subjectId ? "text-[var(--hud)]" : ""}>
                          {c.id} · {c.name}
                        </span>
                        <span style={{ color: STATUS_COLOR[c.status] }}>
                          {c.score} {STATUS_LABEL[c.status]}
                        </span>
                      </li>
                    ))}
                    <li className="pt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--hud-dim)]">Click head, chest or arm for deep telemetry</li>
                  </ul>
                </div>
              )}
              {mod === "risk" && (
                <div className="grid gap-6 md:grid-cols-[240px_1fr]">
                  <Gauge score={snap.subject.risk.score} status={status} />
                  <div>
                    <Contributions risk={snap.subject.risk} />
                    <VascularAxis ndi={m.ndi} bbb={m.bbb} />
                  </div>
                </div>
              )}
              {mod === "link" && <LinkModule snap={snap} />}
              {mod === "forecast" && <WhatIf ndi={m.ndi} />}
              {mod === "checklist" && <Assistant snap={snap} />}
              {mod === "log" && <EventLog snap={snap} />}
            </HoloWindow>
          )}
          {/* The copilot stays mounted so its automatic critical alert keeps working. */}
          <div className={mod === "copilot" ? "contents" : "hidden"}>
            <HoloWindow {...MODULE_TITLE.copilot} onClose={() => setMod(null)}>
              <Copilot snap={snap} />
            </HoloWindow>
          </div>
        </div>
      )}

      {zone && snap && <ZoneModal zone={zone} snap={snap} onClose={() => setZone(null)} />}
      {booting && <Boot onDone={endBoot} />}
    </main>
  );
}
