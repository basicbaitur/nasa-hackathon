// Pure functions: baseline, z-scores, risk, forecast, checklist.

export type MetricKey = "iop" | "bbb" | "ndi" | "hr" | "dose";
export type Metrics = Record<MetricKey, number>;
export type Status = "nominal" | "watch" | "alert";

export const BASELINE: Record<MetricKey, { mean: number; std: number; unit: string; label: string }> = {
  iop: { mean: 15.2, std: 1.2, unit: "mmHg", label: "Intraocular pressure" },
  bbb: { mean: 1.0, std: 0.08, unit: "× baseline", label: "BBB permeability" },
  ndi: { mean: 12, std: 4, unit: "/100", label: "Notch Disruption Index" },
  hr: { mean: 64, std: 5, unit: "bpm", label: "Heart rate" },
  dose: { mean: 6, std: 1.5, unit: "µGy/h", label: "Radiation dose rate" },
};

export const WEIGHTS: Partial<Record<MetricKey, number>> = { ndi: 0.4, dose: 0.25, iop: 0.2, bbb: 0.15 };
const Z_CAP = 4;

export const zScore = (k: MetricKey, v: number) => (v - BASELINE[k].mean) / BASELINE[k].std;

export function ewma(series: number[], alpha = 0.2): number[] {
  const out: number[] = [];
  series.forEach((v, i) => out.push(i === 0 ? v : alpha * v + (1 - alpha) * out[i - 1]));
  return out;
}

/** series of {ts, v}; returns v(now) - v(now-24h) using nearest point. */
export function delta24h(series: { ts: number; v: number }[], hourMs = 3_600_000): number {
  if (series.length < 2) return 0;
  const last = series[series.length - 1];
  const target = last.ts - 24 * hourMs;
  let best = series[0];
  for (const p of series) if (Math.abs(p.ts - target) < Math.abs(best.ts - target)) best = p;
  return last.v - best.v;
}

export function statusOf(score: number): Status {
  return score > 75 ? "alert" : score >= 45 ? "watch" : "nominal";
}

export interface Contribution {
  key: MetricKey;
  label: string;
  value: number;
  z: number;
  weight: number;
  points: number; // contribution to 0-100 score
  share: number; // fraction of total score 0-1
}

export function riskScore(m: Metrics): { score: number; status: Status; contributions: Contribution[] } {
  const contributions: Contribution[] = (Object.keys(WEIGHTS) as MetricKey[]).map((k) => {
    const z = zScore(k, m[k]);
    const zc = Math.min(Z_CAP, Math.max(0, z));
    const w = WEIGHTS[k]!;
    return { key: k, label: BASELINE[k].label, value: m[k], z: round(z, 2), weight: w, points: (w * zc * 100) / Z_CAP, share: 0 };
  });
  const score = Math.round(Math.min(100, contributions.reduce((s, c) => s + c.points, 0)));
  const total = contributions.reduce((s, c) => s + c.points, 0) || 1;
  contributions.forEach((c) => {
    c.share = round(c.points / total, 3);
    c.points = round(c.points, 1);
  });
  contributions.sort((a, b) => b.points - a.points);
  return { score, status: statusOf(score), contributions };
}

export interface ForecastPoint {
  h: number;
  ndi: number;
  baseline: number;
  upper: number; // baseline + 2σ
}

/** Projected NDI for the next `hours`. Extra dose (mSv) adds a delayed bump peaking ~+72 h. */
export function forecast(currentNdi: number, extraDoseMSv = 0, hours = 72, stepH = 2): ForecastPoint[] {
  const { mean, std } = BASELINE.ndi;
  const peakH = 72;
  const k = 2.2;
  const amp = extraDoseMSv * 1.6; // NDI points per mSv at peak
  const out: ForecastPoint[] = [];
  for (let h = 0; h <= hours; h += stepH) {
    const decay = (currentNdi - mean) * Math.exp(-h / 48);
    const x = h / peakH;
    const bump = h === 0 ? 0 : amp * Math.pow(x, k) * Math.exp(k * (1 - x));
    out.push({ h, ndi: round(Math.min(100, Math.max(0, mean + decay + bump)), 1), baseline: mean, upper: mean + 2 * std });
  }
  return out;
}

export interface ChecklistItem {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
}

export const DISCLAIMER = "Decision support, not a diagnosis. A human crew medical officer confirms every action.";

export function checklist(m: Metrics, linkUp = true): { items: ChecklistItem[]; disclaimer: string } {
  const z = (k: MetricKey) => zScore(k, m[k]);
  const { score, status } = riskScore(m);
  const items: ChecklistItem[] = [];
  const add = (id: string, text: string, priority: ChecklistItem["priority"]) => items.push({ id, text, priority });

  if (z("dose") > 3) {
    add("shelter", "Move to storm shelter / water-wall module until dose rate normalises", "high");
    add("dosimeter", "Verify personal dosimeter reading and log cumulative dose", "high");
  }
  if (z("ndi") > 2) {
    add("iop-repeat", "Repeat IOP in 2 h", "high");
    add("symptoms", "Log symptoms (headache, vision, cognition)", "medium");
    add("cmo", linkUp ? "Notify Crew Medical Officer and send digest to ground" : "Notify Crew Medical Officer and queue digest", "high");
  }
  if (z("iop") > 2) add("fundus", "Run OCT / fundoscopy scan", "medium");
  if (z("bbb") > 2) add("cog", "Run 5-min cognitive battery", "medium");
  if (z("hr") > 2.5) add("hr", "Rest 15 min, re-measure heart rate", "low");
  if (status === "alert") add("cm-handover", "Restrict EVA and high-workload tasks until CMO review", "high");
  if (!items.length) add("routine", "Routine: next scheduled vitals check in 4 h", "low");
  if (!linkUp && score >= 45) add("los", "Earth link lost: act on-board, digest will sync on reconnection", "medium");

  return { items, disclaimer: DISCLAIMER };
}

/** Synthetic downstream readouts of the endothelial Notch axis, derived from NDI (demo model). */
export function vascularAxis(ndi: number) {
  const d = ndi - BASELINE.ndi.mean;
  return {
    jag2: 1 + d / 30, // × preflight expression
    notch4: Math.max(0.2, 1 - d / 70), // fraction of preflight activity
    fmd: Math.max(1.5, 7.2 - d * 0.09), // flow-mediated dilation, %
    integrity: Math.max(0, Math.min(100, 100 - Math.max(0, d) * 1.4)), // composite 0-100
  };
}

export const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
