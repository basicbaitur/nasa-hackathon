"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { zScore } from "@/lib/engine";
import type { CrewSnap } from "@/components/astro/ui";
import { blip, chord } from "@/components/astro/audio";

type Msg = { id: number; role: "ai" | "crew"; text: string; critical?: boolean; voice?: boolean; ts: string };

const ALERT_TEXT =
  "WARNING: Anomaly detected in endothelial Notch signaling. Elevated risk of BBB permeability. Recommend immediate administration of radiation countermeasures and monitoring Jag2 expression.";

const REPLY_TEXT =
  "Vascular degradation in microgravity combines cephalad fluid shift, endothelial dysfunction and radiation-driven oxidative stress. On-board protocol: (1) aerobic + resistive exercise ≥ 90 min/day to restore endothelial shear stress; (2) lower-body negative pressure sessions to counter the fluid shift; (3) antioxidant countermeasure per the flight medical kit; (4) repeat IOP and NDI every 2 h and track against the ±2σ baseline band; (5) escalate to the Crew Medical Officer if NDI stays above band for 6 h. Final decision rests with the CMO.";

const clock = () => new Date().toISOString().slice(11, 19);

/* Minimal typings for the native Web Speech API (not in lib.dom for all TS versions). */
interface SRResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SREvent {
  resultIndex: number;
  results: ArrayLike<SRResult>;
}
interface SR {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SRCtor = new () => SR;

function getSR(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\(\d\)/g, ""));
  u.rate = 1.04;
  u.pitch = 0.9;
  const v = window.speechSynthesis.getVoices().find((x) => /en[-_](US|GB)/i.test(x.lang) && /Google|Daniel|Samantha|Microsoft/i.test(x.name));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

export default function Copilot({ snap }: { snap: CrewSnap }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 0, role: "ai", text: "AI Medical Copilot online. Monitoring CM-3 on board. Tap the mic for hands-free mode.", ts: "--:--:--" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOut, setVoiceOut] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const armed = useRef(true);
  const seq = useRef(1);
  const listRef = useRef<HTMLOListElement>(null);
  const recRef = useRef<SR | null>(null);
  const voiceOutRef = useRef(voiceOut);
  voiceOutRef.current = voiceOut;

  useEffect(() => setSupported(!!getSR()), []);

  const push = useCallback((m: Omit<Msg, "id" | "ts">) => {
    setMsgs((prev) => [...prev.slice(-30), { ...m, id: seq.current++, ts: clock() }]);
  }, []);

  // Auto critical alert: solar event active and NDI above baseline +2σ. Re-arms once NDI is back in band.
  const ndiZ = zScore("ndi", snap.subject.metrics.ndi);
  const spiking = snap.controls.sunEvent && ndiZ > 2;
  const alertActive = spiking && msgs.some((m) => m.critical);
  useEffect(() => {
    if (spiking && armed.current) {
      armed.current = false;
      push({ role: "ai", text: ALERT_TEXT, critical: true });
      if (voiceOutRef.current) setTimeout(() => speak(ALERT_TEXT), 1900);
    } else if (!spiking && ndiZ < 1) armed.current = true;
  }, [spiking, ndiZ, push]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  const ask = useCallback(
    (q: string, viaVoice = false) => {
      const text = q.trim();
      if (!text) return;
      push({ role: "crew", text, voice: viaVoice });
      setInput("");
      setTyping(true);
      blip(1400, 0.02);
      setTimeout(() => {
        setTyping(false);
        push({ role: "ai", text: REPLY_TEXT });
        chord([880, 1320], 0.015, 0.12);
        if (viaVoice && voiceOutRef.current) speak(REPLY_TEXT);
      }, 900);
    },
    [push],
  );

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typing) ask(input);
  };

  const toggleMic = () => {
    const Ctor = getSR();
    if (!Ctor) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    setMicError(null);
    window.speechSynthesis?.cancel();
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setInput((finalText + interim).trim());
    };
    rec.onerror = (e) => {
      setMicError(e.error === "not-allowed" ? "Microphone permission denied" : e.error === "network" ? "Speech service unreachable" : `Mic error: ${e.error}`);
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      if (finalText.trim()) ask(finalText, true);
    };
    recRef.current = rec;
    setListening(true);
    chord([660, 990], 0.03, 0.08);
    rec.start();
  };

  useEffect(() => () => recRef.current?.abort(), []);

  return (
    <section className={`print-panel glass ${alertActive ? "glow-alert" : "glow-nominal"} relative flex h-full flex-col rounded-2xl p-5`}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          AI Medical Copilot
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setVoiceOut((v) => !v);
              window.speechSynthesis?.cancel();
            }}
            aria-pressed={voiceOut}
            aria-label={voiceOut ? "Mute spoken replies" : "Enable spoken replies"}
            title={voiceOut ? "Spoken replies on" : "Spoken replies off"}
            className={`no-print grid h-7 w-7 place-items-center rounded-md border text-xs transition-all ${voiceOut ? "border-accent/50 text-accent shadow-[0_0_10px_rgba(76,201,240,0.35)]" : "border-white/10 text-muted"}`}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              {voiceOut ? <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /> : <path d="m22 9-6 6M16 9l6 6" />}
            </svg>
          </button>
          <span className="rounded-full border border-accent/30 bg-accent/5 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-accent/80">on-board</span>
        </div>
      </header>

      <ol ref={listRef} aria-live="polite" className="max-h-64 min-h-40 flex-1 space-y-2 overflow-y-auto pr-1">
        {msgs.map((m) => (
          <li key={m.id} className={`flex ${m.role === "crew" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-lg px-3 py-2 text-[13px] leading-snug ${
                m.critical
                  ? "border border-alert/70 bg-alert/10 text-alert shadow-[0_0_18px_rgba(255,122,122,0.35)]"
                  : m.role === "crew"
                    ? "border border-accent/40 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-ink shadow-[0_0_12px_rgba(76,201,240,0.2)]"
                    : "border border-white/10 bg-white/[0.04] text-ink"
              }`}
            >
              <p className="mb-1 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted">
                {m.critical ? "⚠ Critical alert" : m.role === "crew" ? `CM-3${m.voice ? " · 🎙 voice" : ""}` : "Copilot"} · {m.ts}
              </p>
              {m.text}
            </div>
          </li>
        ))}
        {typing && (
          <li className="animate-pulse font-mono text-[11px] uppercase tracking-[0.15em] text-accent" aria-label="Copilot is typing">
            ▌ Copilot analysing telemetry…
          </li>
        )}
      </ol>

      {listening && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-alert/40 bg-alert/5 px-3 py-2" role="status">
          <div className="flex h-5 items-end gap-0.5" aria-hidden>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span key={i} className="w-1 rounded-full bg-alert animate-[eq_0.9s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.1}s`, height: "100%" }} />
            ))}
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-alert">Listening… speak your question</span>
        </div>
      )}

      <form onSubmit={send} className="no-print mt-3 flex gap-2">
        <button
          type="button"
          onClick={toggleMic}
          disabled={!supported}
          aria-pressed={listening}
          aria-label={listening ? "Stop listening" : "Ask by voice"}
          title={supported ? "Hands-free voice query" : "Voice input needs Chrome or Edge"}
          className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${
            listening
              ? "border-alert bg-alert/20 text-alert shadow-[0_0_24px_rgba(255,122,122,0.7)]"
              : "border-accent/60 bg-accent/10 text-accent shadow-[0_0_16px_rgba(76,201,240,0.45)]"
          }`}
        >
          {listening && <span aria-hidden className="absolute inset-0 animate-ping rounded-xl border border-alert/60" />}
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>
        <label htmlFor="copilot-q" className="sr-only">
          Ask the AI Medical Copilot
        </label>
        <input
          id="copilot-q"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? "Transcribing…" : "Ask or tap the mic…"}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm placeholder:text-muted/60 focus:border-accent/60 focus:shadow-[0_0_14px_rgba(76,201,240,0.3)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || typing || listening}
          className="launch-btn rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-white shadow-[0_0_16px_rgba(76,201,240,0.5)] transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
        >
          Ask
        </button>
      </form>
      {micError && (
        <p role="alert" className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-alert">
          {micError}
        </p>
      )}
      <p className="mt-2 text-[10px] text-muted">Synthetic demo responses. Decision support, not a diagnosis; the CMO confirms every action.</p>
    </section>
  );
}
