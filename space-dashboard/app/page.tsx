"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaceScan, PinPad } from "@/components/astro/Auth";

const CONTROLS = [
  {
    href: "/crew",
    code: "CTRL-01",
    auth: "Biometric face scan",
    title: "Crew console",
    body: "On board, offline-first. Live vitals, explainable risk score, 72 h forecast, AI copilot, sync queue.",
    from: "from-cyan-400",
    to: "to-blue-600",
    glow: "rgba(76,201,240,0.55)",
  },
  {
    href: "/ground",
    code: "CTRL-02",
    auth: "Clearance code",
    title: "Ground segment",
    body: "Mission Control. Delay-tolerant digests, crew status, 14-day trends, reply uplink, printable report.",
    from: "from-blue-500",
    to: "to-violet-600",
    glow: "rgba(99,102,241,0.55)",
  },
];

const STATS = [
  { k: "44 min", v: "max Mars round-trip delay" },
  { k: "0 s", v: "on-board decision latency" },
  { k: "4", v: "crew monitored live" },
  { k: "14 d", v: "personal baseline history" },
];

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Home() {
  const router = useRouter();
  const now = useClock();
  const [auth, setAuth] = useState<null | "/crew" | "/ground">(null);
  useEffect(() => {
    router.prefetch("/crew");
    router.prefetch("/ground");
  }, [router]);
  const cancel = useCallback(() => setAuth(null), []);
  const goCrew = useCallback(() => router.push("/crew"), [router]);
  const goGround = useCallback(() => router.push("/ground"), [router]);

  return (
    <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16">
      <div className="glass mb-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em]">
        <span className="text-accent">AstroSentinel OS v5.0 · secure terminal</span>
        <span className="tabular-nums text-ink">{now ? `${now.toISOString().slice(0, 10)} · ${now.toISOString().slice(11, 19)} UTC` : "----"}</span>
        <span className="flex items-center gap-2 rounded-md border border-watch/50 bg-watch/10 px-2.5 py-1 text-watch shadow-[0_0_12px_rgba(255,180,84,0.3)]">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          System locked
        </span>
      </div>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/10">
        <div className="absolute inset-10 rounded-full border border-dashed border-accent/10 motion-safe:animate-[spin_90s_linear_infinite]" />
        <div className="absolute inset-24 rounded-full bg-[radial-gradient(circle,rgba(76,201,240,0.18),transparent_70%)] motion-safe:animate-pulse" />
      </div>

      <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-accent">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        NASA Space Apps · Mission health systems
      </div>

      <h1 className="mt-6 bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-6xl font-bold leading-none tracking-tight text-transparent drop-shadow-[0_0_35px_rgba(76,201,240,0.35)] sm:text-8xl lg:text-9xl">
        AstroSentinel
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
        Offline-first health monitoring for astronauts when the Earth link is lost. At Mars, a message takes up to{" "}
        <span className="neon-text font-semibold text-accent">22 minutes</span> each way (44 min round trip), and solar conjunction cuts the link for weeks. The medical answer has to be on board.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {CONTROLS.map((c) => (
          <button
            type="button"
            key={c.href}
            onClick={() => setAuth(c.href as "/crew" | "/ground")}
            className="launch-btn glass group relative rounded-3xl p-7 text-left transition-all duration-300 hover:scale-105 focus-visible:scale-105"
            style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 0 30px -8px ${c.glow}` }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">{c.code}</span>
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-nominal">
                <span className="h-1.5 w-1.5 rounded-full bg-nominal shadow-[0_0_8px_#5EE0C1]" aria-hidden />
                Armed
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              <span aria-hidden>{c.href === "/crew" ? "◉" : "⌗"}</span> Auth: {c.auth}
            </div>
            <h2 className={`mt-6 bg-gradient-to-r ${c.from} ${c.to} bg-clip-text text-3xl font-bold text-transparent`}>{c.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{c.body}</p>
            <div
              className={`mt-7 flex items-center justify-between rounded-2xl bg-gradient-to-r ${c.from} ${c.to} px-5 py-3.5 font-mono text-sm font-bold uppercase tracking-[0.25em] text-white transition-shadow group-hover:shadow-[0_0_30px_var(--g)]`}
              style={{ ["--g" as string]: c.glow, boxShadow: `0 0 18px ${c.glow}` }}
            >
              <span>Authenticate &amp; launch</span>
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>
          </button>
        ))}
      </div>

      <dl className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.v} className="glass rounded-2xl px-5 py-4">
            <dt className="sr-only">{s.v}</dt>
            <dd className="neon-text font-mono text-2xl font-semibold text-accent">{s.k}</dd>
            <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-muted">{s.v}</p>
          </div>
        ))}
      </dl>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <Link href="/dashboard" className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted underline-offset-4 hover:text-accent hover:underline">
          Original single-page dashboard →
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted/80">Demo build · synthetic data calibrated on NASA open-data ranges</p>
      </div>
      {auth === "/crew" && <FaceScan onDone={goCrew} onCancel={cancel} />}
      {auth === "/ground" && <PinPad onDone={goGround} onCancel={cancel} />}
    </main>
  );
}
