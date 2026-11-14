"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Status } from "@/lib/engine";

/* Native Web Audio telemetry: soft radar ping when nominal, klaxon on alert. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function unlockAudio() {
  const a = audio();
  if (a && a.state === "suspended") a.resume().catch(() => {});
}

/** Soft sonar ping with echo. */
export function ping(freq = 1180, vol = 0.035) {
  const a = audio();
  if (!a || !master || a.state !== "running") return;
  const t = a.currentTime;
  const delay = a.createDelay();
  delay.delayTime.value = 0.28;
  const fb = a.createGain();
  fb.gain.value = 0.32;
  delay.connect(fb).connect(delay);
  delay.connect(master);
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.62, t + 0.5);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  o.connect(g);
  g.connect(master);
  g.connect(delay);
  o.start(t);
  o.stop(t + 0.75);
  setTimeout(() => {
    delay.disconnect();
    fb.disconnect();
  }, 2500);
}

/** Two-tone sweeping klaxon. */
export function klaxon(duration = 1.8, vol = 0.07) {
  const a = audio();
  if (!a || !master || a.state !== "running") return;
  const t = a.currentTime;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2200;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
  g.gain.setValueAtTime(vol, t + duration - 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  lp.connect(g).connect(master);
  for (const detune of [0, 7]) {
    const o = a.createOscillator();
    o.type = "sawtooth";
    o.detune.value = detune;
    const step = 0.3;
    for (let i = 0; i * step < duration; i++) {
      const at = t + i * step;
      o.frequency.setValueAtTime(i % 2 ? 520 : 780, at);
      o.frequency.linearRampToValueAtTime(i % 2 ? 780 : 520, at + step);
    }
    o.connect(lp);
    o.start(t);
    o.stop(t + duration + 0.05);
  }
}

/** UI click / confirm blips. */
export function blip(freq = 1600, vol = 0.03, dur = 0.06) {
  const a = audio();
  if (!a || !master || a.state !== "running") return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = "square";
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function chord(freqs: number[], vol = 0.04, dur = 0.5) {
  freqs.forEach((f, i) => setTimeout(() => blip(f, vol, dur), i * 90));
}

const KEY = "astro-sound";

export function useSoundPref() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v !== null) setOn(v === "1");
    } catch {}
  }, []);
  const toggle = useCallback(() => {
    setOn((v) => {
      try {
        localStorage.setItem(KEY, v ? "0" : "1");
      } catch {}
      if (!v) unlockAudio();
      return !v;
    });
  }, []);
  return { on, toggle };
}

/** Plays telemetry sounds from the live risk status. Browsers need one user gesture before audio starts. */
export function useAudioTelemetry(status: Status | undefined, enabled: boolean) {
  const statusRef = useRef(status);
  const prev = useRef<Status | undefined>(undefined);
  statusRef.current = status;

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Transition into alert -> klaxon.
  useEffect(() => {
    if (enabled && status === "alert" && prev.current && prev.current !== "alert") klaxon();
    prev.current = status;
  }, [status, enabled]);

  // Periodic cue every 3 s: ping when nominal, lower ping when watch, short alarm while alert.
  useEffect(() => {
    if (!enabled) return;
    let n = 0;
    const id = setInterval(() => {
      n++;
      const s = statusRef.current;
      if (s === "nominal") ping(1180, 0.03);
      else if (s === "watch") ping(700, 0.045);
      else if (s === "alert" && n % 2 === 0) klaxon(0.6, 0.05);
    }, 3000);
    return () => clearInterval(id);
  }, [enabled]);
}
