// Synthetic crew simulator. 1 tick = 1 real second = 1 simulated minute.
import { BASELINE, Metrics, MetricKey, riskScore, round } from "./engine";

export const CREW_IDS = ["CM-1", "CM-2", "CM-3", "CM-4"] as const;
export const SUBJECT = "CM-3";
export const SIM_MIN = 60_000;
export const SIM_HOUR = 60 * SIM_MIN;
const LIVE_LEN = 120;

export interface HourPoint {
  ts: number; // sim time
  ndi: number;
  score: number;
  dose: number;
}

export interface SimEvent {
  ts: number; // sim time
  type: "solar" | "los" | "aos" | "note";
  label: string;
}

export interface CrewState {
  id: string;
  name: string;
  sensitivity: number; // shielding / individual response factor
  metrics: Metrics;
  ndiDrift: number; // latent NDI elevation
  live: Record<MetricKey, number[]>; // last LIVE_LEN ticks
  hourly: HourPoint[]; // 14 days compressed + live hourly appends
}

const NAMES: Record<string, string> = { "CM-1": "Cmdr. Reyes", "CM-2": "Dr. Okafor", "CM-3": "Eng. Lindqvist", "CM-4": "Spec. Tanaka" };
const SENS: Record<string, number> = { "CM-1": 0.6, "CM-2": 0.75, "CM-3": 1.0, "CM-4": 0.55 };

let seed = 42;
export const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const gauss = () => {
  let u = 0, v = 0;
  while (!u) u = rand();
  while (!v) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const noise = (k: MetricKey, f = 0.35) => gauss() * BASELINE[k].std * f;

/** Instantaneous metrics given latent drift + dose state. */
export function sample(ndiDrift: number, doseExtra: number, sens: number): Metrics {
  const d = ndiDrift * sens;
  return {
    ndi: round(Math.max(0, BASELINE.ndi.mean + d + noise("ndi")), 1),
    dose: round(Math.max(0, BASELINE.dose.mean + doseExtra * sens + noise("dose")), 1),
    iop: round(BASELINE.iop.mean + d * 0.09 + noise("iop"), 1),
    bbb: round(BASELINE.bbb.mean + d * 0.006 + noise("bbb"), 3),
    hr: Math.round(BASELINE.hr.mean + d * 0.2 + (doseExtra > 0 ? 6 : 0) + noise("hr")),
  };
}

/** Generate 14 days of hourly history ending at simNow, with two past minor events. */
export function generateHistory(simNow: number, sens: number, events: SimEvent[]): HourPoint[] {
  const out: HourPoint[] = [];
  const hours = 14 * 24;
  const evHours = [hours - 9 * 24, hours - 4 * 24 + 6]; // minor SPEs at day -9 and day -4
  for (let i = 0; i < hours; i++) {
    let drift = 0, doseExtra = 0;
    for (const eh of evHours) {
      const dt = i - eh;
      if (dt >= 0 && dt < 6) doseExtra += 40;
      if (dt >= 0) drift += 9 * (dt / 30) * Math.exp(1 - dt / 30);
    }
    const m = sample(drift, doseExtra, sens);
    out.push({ ts: simNow - (hours - i) * SIM_HOUR, ndi: m.ndi, dose: m.dose, score: riskScore(m).score });
  }
  if (!events.length) {
    events.push({ ts: simNow - 9 * 24 * SIM_HOUR, type: "solar", label: "Minor SPE (S1)" });
    events.push({ ts: simNow - (4 * 24 - 6) * SIM_HOUR, type: "solar", label: "Minor SPE (S1)" });
  }
  return out;
}

export function createCrew(simNow: number, events: SimEvent[]): CrewState[] {
  return CREW_IDS.map((id) => {
    const sens = SENS[id];
    const metrics = sample(0, 0, sens);
    const live = { iop: [], bbb: [], ndi: [], hr: [], dose: [] } as Record<MetricKey, number[]>;
    return { id, name: NAMES[id], sensitivity: sens, metrics, ndiDrift: 0, live, hourly: generateHistory(simNow, sens, events) };
  });
}

/** Advance one tick (1 sim minute). */
export function stepCrew(c: CrewState, sunEvent: boolean, sunAge: number, simNow: number, tick: number) {
  // Solar event: dose spike immediately, NDI drifts up over time (capped), decays after.
  const doseExtra = sunEvent ? 260 * Math.min(1, (sunAge + 1) / 3) : 0;
  if (sunEvent) c.ndiDrift = Math.min(70, c.ndiDrift + 1.2);
  else c.ndiDrift = Math.max(0, c.ndiDrift * 0.985 - 0.02);
  c.metrics = sample(c.ndiDrift, doseExtra, c.sensitivity);
  (Object.keys(c.live) as MetricKey[]).forEach((k) => {
    c.live[k].push(c.metrics[k]);
    if (c.live[k].length > LIVE_LEN) c.live[k].shift();
  });
  if (tick % 60 === 0) {
    c.hourly.push({ ts: simNow, ndi: c.metrics.ndi, dose: c.metrics.dose, score: riskScore(c.metrics).score });
    if (c.hourly.length > 14 * 24 + 48) c.hourly.shift();
  }
}
