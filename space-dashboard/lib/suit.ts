// Synthetic suit life-support telemetry (PLSS) for the helmet HUD.
// Derived deterministically from the sim tick so every client shows the same values.
// Ranges are illustrative, loosely based on public NASA EMU / xEMU figures.
import type { Status } from "./engine";

export const EVA_LEN = 480; // sim minutes per EVA cycle (8 h), then consumables are "swapped"

export interface SuitReading {
  key: "o2" | "co2" | "press" | "batt" | "temp" | "h2o";
  label: string;
  short: string;
  value: number;
  unit: string;
  digits: number;
  /** 0–1 fill for bar/arc gauges */
  fill: number;
  status: Status;
}

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const wobble = (t: number, p: number, a: number) => a * Math.sin((t / p) * Math.PI * 2);

export function suitTelemetry(tick: number, hr: number, sunEvent: boolean) {
  const t = tick % EVA_LEN;
  const used = t / EVA_LEN;
  const exertion = clamp((hr - 60) / 60); // 0 at rest → 1 at 120 bpm

  const o2 = 100 - used * 64 - exertion * 4; // primary O2 tank %
  const co2 = 1.1 + exertion * 3.4 + wobble(tick, 7, 0.25) + (sunEvent ? 0.6 : 0); // ppCO2 mmHg
  const press = 4.3 + wobble(tick, 11, 0.025); // suit pressure psid
  const batt = 100 - used * 71 - (sunEvent ? 2 : 0); // %
  const temp = 21.6 + exertion * 3.2 + wobble(tick, 17, 0.2) + (sunEvent ? 0.9 : 0); // °C
  const h2o = 100 - used * 58 - exertion * 3; // feedwater %

  // Minutes of O2 left at the current draw rate, reserve kept at 12 %.
  const o2Rate = 64 / EVA_LEN + exertion * 0.01;
  const o2Min = Math.max(0, (o2 - 12) / o2Rate);

  const lowIs = (v: number, watch: number, alert: number): Status => (v < alert ? "alert" : v < watch ? "watch" : "nominal");
  const highIs = (v: number, watch: number, alert: number): Status => (v > alert ? "alert" : v > watch ? "watch" : "nominal");

  const readings: SuitReading[] = [
    { key: "o2", label: "Primary O₂", short: "O₂", value: o2, unit: "%", digits: 0, fill: clamp(o2 / 100), status: lowIs(o2, 35, 20) },
    { key: "co2", label: "CO₂ partial pressure", short: "CO₂", value: co2, unit: "mmHg", digits: 1, fill: clamp(co2 / 8), status: highIs(co2, 4, 7.6) },
    { key: "press", label: "Suit pressure", short: "PRESS", value: press, unit: "psi", digits: 2, fill: clamp(press / 5), status: lowIs(press, 4.1, 3.8) },
    { key: "batt", label: "PLSS battery", short: "BATT", value: batt, unit: "%", digits: 0, fill: clamp(batt / 100), status: lowIs(batt, 30, 15) },
    { key: "temp", label: "Suit temperature", short: "TEMP", value: temp, unit: "°C", digits: 1, fill: clamp((temp - 15) / 15), status: highIs(temp, 25, 27) },
    { key: "h2o", label: "Feedwater", short: "H₂O", value: h2o, unit: "%", digits: 0, fill: clamp(h2o / 100), status: lowIs(h2o, 30, 15) },
  ];

  return { readings, o2Min, respRate: Math.round(12 + exertion * 10) };
}
