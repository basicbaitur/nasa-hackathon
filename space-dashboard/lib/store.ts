// In-memory server singleton: simulator loop, controls, delay-tolerant queue.
import { checklist, forecast, Metrics, riskScore, Status, MetricKey, statusOf } from "./engine";
import { createCrew, CrewState, SimEvent, SIM_MIN, SUBJECT, stepCrew } from "./sim";

export const DIGEST_EVERY = 10; // ticks between digest packets

export interface Digest {
  id: string;
  ts: number; // sim time created
  crewId: string;
  score: number;
  status: Status;
  metrics: Metrics;
  actionsTaken: string[];
  deliverAt?: number; // real ms
  sentAt?: number; // real ms, when transmission started
  queuedWhileLOS?: boolean;
}

export interface Reply {
  id: string;
  crewId: string;
  text: string;
  sentAt: number; // real ms
  deliverAt?: number; // real ms (undefined = waiting for link)
  releasedAt?: number; // real ms, when uplink transmission started
  delivered: boolean;
}

export interface LogEntry {
  ts: number; // sim time
  kind: "info" | "warn" | "alert" | "ground" | "link";
  text: string;
}

export interface Controls {
  linkUp: boolean;
  delayMin: 0 | 3 | 12 | 22; // one-way light time, min (Mars: ~3 closest to ~22 farthest)
  sunEvent: boolean;
}

interface Store {
  started: boolean;
  bootReal: number;
  simStart: number;
  tick: number;
  controls: Controls;
  sunStartTick: number;
  crew: CrewState[];
  events: SimEvent[];
  queue: Digest[]; // crew side, waiting for link
  ground: { inbox: Digest[] }; // in transit + delivered
  replies: Reply[];
  log: LogEntry[];
  actionsTaken: Set<string>;
  lastStatus: Record<string, Status>;
  seq: number;
}

const g = globalThis as unknown as { __astro?: Store };

export function store(): Store {
  if (!g.__astro) {
    const now = Date.now();
    const simStart = now;
    const events: SimEvent[] = [];
    g.__astro = {
      started: false,
      bootReal: now,
      simStart,
      tick: 0,
      controls: { linkUp: true, delayMin: 12, sunEvent: false },
      sunStartTick: 0,
      crew: createCrew(simStart, events),
      events,
      queue: [],
      ground: { inbox: [] },
      replies: [],
      log: [{ ts: simStart, kind: "info", text: "AstroSentinel online. Baseline loaded (14 d preflight + mission)." }],
      actionsTaken: new Set(),
      lastStatus: {},
      seq: 0,
    };
  }
  const s = g.__astro;
  if (!s.started) {
    s.started = true;
    setInterval(() => tick(s), 1000);
  }
  return s;
}

export const simNow = (s: Store) => s.simStart + s.tick * SIM_MIN;
const log = (s: Store, kind: LogEntry["kind"], text: string) => {
  s.log.push({ ts: simNow(s), kind, text });
  if (s.log.length > 200) s.log.shift();
};
const delayMs = (s: Store) => s.controls.delayMin * 1000; // 1 real s = 1 sim min

function tick(s: Store) {
  s.tick++;
  const now = simNow(s);
  const sunAge = s.tick - s.sunStartTick;
  for (const c of s.crew) {
    stepCrew(c, s.controls.sunEvent, sunAge, now, s.tick);
    const st = riskScore(c.metrics).status;
    if (c.id === SUBJECT && s.lastStatus[c.id] && s.lastStatus[c.id] !== st)
      log(s, st === "alert" ? "alert" : st === "watch" ? "warn" : "info", `${c.id} risk status → ${st.toUpperCase()}`);
    s.lastStatus[c.id] = st;
  }

  // Digest packets
  if (s.tick % DIGEST_EVERY === 0) {
    for (const c of s.crew) {
      const r = riskScore(c.metrics);
      const d: Digest = {
        id: `D${++s.seq}`,
        ts: now,
        crewId: c.id,
        score: r.score,
        status: r.status,
        metrics: { ...c.metrics },
        actionsTaken: c.id === SUBJECT ? [...s.actionsTaken] : [],
      };
      if (s.controls.linkUp) {
        d.sentAt = Date.now();
        d.deliverAt = d.sentAt + delayMs(s);
        s.ground.inbox.push(d);
      } else {
        d.queuedWhileLOS = true;
        s.queue.push(d);
      }
    }
    if (s.ground.inbox.length > 2000) s.ground.inbox.splice(0, s.ground.inbox.length - 2000);
  }

  // Ground → crew replies
  const real = Date.now();
  for (const r of s.replies) {
    if (!r.delivered && r.deliverAt !== undefined && r.deliverAt <= real) {
      r.delivered = true;
      log(s, "ground", `Ground → ${r.crewId}: ${r.text}`);
    }
  }
}

export function setControls(p: Partial<Controls> & { action?: { id: string; done: boolean } }) {
  const s = store();
  const c = s.controls;
  if (typeof p.sunEvent === "boolean" && p.sunEvent !== c.sunEvent) {
    c.sunEvent = p.sunEvent;
    if (p.sunEvent) {
      s.sunStartTick = s.tick;
      s.events.push({ ts: simNow(s), type: "solar", label: "Solar particle event" });
      log(s, "alert", "Solar particle event detected: dose rate spiking");
    } else log(s, "info", "Solar event ended: dose rate returning to baseline");
  }
  if (p.delayMin !== undefined && [0, 3, 12, 22].includes(p.delayMin) && p.delayMin !== c.delayMin) {
    c.delayMin = p.delayMin;
    log(s, "link", `One-way light time set to ${p.delayMin} min (round trip ${p.delayMin * 2} min)`);
  }
  if (typeof p.linkUp === "boolean" && p.linkUp !== c.linkUp) {
    c.linkUp = p.linkUp;
    if (!p.linkUp) {
      s.events.push({ ts: simNow(s), type: "los", label: "Loss of signal" });
      log(s, "link", "LOS: Earth link lost. Operating autonomously, digests queued.");
    } else {
      const at = Date.now() + delayMs(s);
      const n = s.queue.length;
      for (const d of s.queue) {
        d.sentAt = Date.now();
        d.deliverAt = at;
        s.ground.inbox.push(d);
      }
      s.queue = [];
      for (const r of s.replies)
        if (r.deliverAt === undefined) {
          r.releasedAt = Date.now();
          r.deliverAt = at;
        }
      s.events.push({ ts: simNow(s), type: "aos", label: "Link restored" });
      log(s, "link", `Link UP: ${n} queued packets transmitted, arriving in ${c.delayMin} min`);
    }
  }
  if (p.action) {
    if (p.action.done) s.actionsTaken.add(p.action.id);
    else s.actionsTaken.delete(p.action.id);
  }
  return c;
}

export function addReply(crewId: string, text: string): Reply {
  const s = store();
  const r: Reply = {
    id: `R${++s.seq}`,
    crewId,
    text: text.slice(0, 500),
    sentAt: Date.now(),
    deliverAt: s.controls.linkUp ? Date.now() + delayMs(s) : undefined,
    releasedAt: s.controls.linkUp ? Date.now() : undefined,
    delivered: false,
  };
  s.replies.push(r);
  return r;
}

/** Packets currently in flight between Mars and Earth, for the deep-space link visualiser. */
export function linkSnapshot() {
  const s = store();
  const real = Date.now();
  const down = s.ground.inbox
    .filter((d) => d.deliverAt !== undefined && d.deliverAt > real)
    .map((d) => ({ id: d.id, crewId: d.crewId, status: d.status, sentAt: d.sentAt ?? real, deliverAt: d.deliverAt! }));
  const up = s.replies
    .filter((r) => !r.delivered && r.deliverAt !== undefined)
    .map((r) => ({ id: r.id, crewId: r.crewId, sentAt: r.releasedAt ?? r.sentAt, deliverAt: r.deliverAt! }));
  return {
    serverNow: real,
    linkUp: s.controls.linkUp,
    delayMin: s.controls.delayMin,
    sunEvent: s.controls.sunEvent,
    buffered: s.queue.length,
    uplinkHeld: s.replies.filter((r) => r.deliverAt === undefined).length,
    down: down.slice(-60),
    up,
  };
}

export function crewSnapshot() {
  const s = store();
  const now = simNow(s);
  const subject = s.crew.find((c) => c.id === SUBJECT)!;
  const subjRisk = riskScore(subject.metrics);
  const cl = checklist(subject.metrics, s.controls.linkUp);
  const toNext = DIGEST_EVERY - (s.tick % DIGEST_EVERY);
  return {
    simNow: now,
    tick: s.tick,
    controls: s.controls,
    subjectId: SUBJECT,
    crew: s.crew.map((c) => {
      const r = riskScore(c.metrics);
      return { id: c.id, name: c.name, metrics: c.metrics, score: r.score, status: r.status };
    }),
    subject: {
      id: subject.id,
      name: subject.name,
      metrics: subject.metrics,
      risk: subjRisk,
      live: subject.live as Record<MetricKey, number[]>,
      checklist: { ...cl, items: cl.items.map((i) => ({ ...i, done: s.actionsTaken.has(i.id) })) },
    },
    queue: {
      count: s.queue.length,
      nextSync: s.controls.linkUp ? `${toNext} s` : "on link restore",
      inTransitUp: s.ground.inbox.filter((d) => (d.deliverAt ?? 0) > Date.now()).length,
      repliesPending: s.replies.filter((r) => !r.delivered).length,
    },
    log: s.log.slice(-40).reverse(),
    link: linkSnapshot(),
  };
}

export function groundSnapshot(crewId = SUBJECT) {
  const s = store();
  const real = Date.now();
  const now = simNow(s);
  const delivered = s.ground.inbox.filter((d) => (d.deliverAt ?? Infinity) <= real);
  const lastDeliverAt = delivered.reduce((m, d) => Math.max(m, d.deliverAt!), 0);
  // Ground only knows what it has received: history up to the latest delivered digest per crew.
  const knownSeries = (c: CrewState) => {
    const mine = delivered.filter((d) => d.crewId === c.id).sort((a, b) => a.ts - b.ts);
    const cutoff = mine.length ? mine[mine.length - 1].ts : s.simStart;
    const hourly = c.hourly.filter((p) => p.ts <= cutoff);
    const lastH = hourly.length ? hourly[hourly.length - 1].ts : 0;
    const extra = mine.filter((d) => d.ts > lastH).map((d) => ({ ts: d.ts, ndi: d.metrics.ndi, score: d.score, dose: d.metrics.dose }));
    return { series: [...hourly, ...extra], latest: mine[mine.length - 1] };
  };
  const crew = s.crew.map((c) => {
    const { series, latest } = knownSeries(c);
    const h = series.filter((p) => p.ts >= (series[series.length - 1]?.ts ?? 0) - 72 * 60 * SIM_MIN);
    return {
      id: c.id,
      name: c.name,
      score: latest?.score ?? h[h.length - 1]?.score ?? 0,
      status: latest?.status ?? statusOf(h[h.length - 1]?.score ?? 0),
      lastDigestTs: latest?.ts ?? null,
      spark72h: h.map((p) => p.score),
    };
  });
  const sel = s.crew.find((c) => c.id === crewId) ?? s.crew.find((c) => c.id === SUBJECT)!;
  const selKnown = knownSeries(sel);
  const last = selKnown.latest;
  return {
    simNow: now,
    lastPacketAgoMin: lastDeliverAt ? Math.round((real - lastDeliverAt) / 1000) : null, // 1 real s = 1 sim min
    inbox: [...delivered].sort((a, b) => b.ts - a.ts).slice(0, 30),
    inTransit: s.ground.inbox.length - delivered.length,
    crew,
    selected: {
      id: sel.id,
      name: sel.name,
      history: selKnown.series.map((p) => ({ ts: p.ts, ndi: p.ndi, score: p.score })),
      baseline: { mean: 12, low: 4, high: 20 },
      events: s.events,
    },
    latestDigest: last ?? null,
    link: linkSnapshot(),
    replies: s.replies.slice(-10).reverse(),
  };
}

export function forecastFor(extraDoseMSv: number, crewId = SUBJECT) {
  const s = store();
  const c = s.crew.find((x) => x.id === crewId) ?? s.crew[2];
  return forecast(c.metrics.ndi, Math.max(0, Math.min(40, extraDoseMSv)));
}
