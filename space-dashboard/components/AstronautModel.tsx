// components/AstronautModel.tsx
"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

export type Zone = "head" | "chest" | "arm";
export type ZoneStatus = "nominal" | "watch" | "alert";

type Geometry =
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; rotate: number };

export interface ZoneConfig {
  id: Zone;
  index: string;
  title: string;
  label: string;
  sublabel: string;
  color: string;
  geometry: Geometry;
  callout: { points: Array<[number, number]>; x: number; y: number; anchor: "start" | "end" };
}

export const ZONE_CONFIG: Record<Zone, ZoneConfig> = {
  head: {
    id: "head",
    index: "Z-01",
    title: "Head / Eyes",
    label: "NEURO-OCULAR",
    sublabel: "SANS · BBB permeability",
    color: "#22d3ee",
    geometry: { kind: "circle", cx: 210, cy: 104, r: 78 },
    callout: { points: [[265, 49], [296, 30], [324, 30]], x: 330, y: 27, anchor: "start" },
  },
  chest: {
    id: "chest",
    index: "Z-02",
    title: "Chest / Heart",
    label: "CARDIOVASCULAR",
    sublabel: "Endothelium · Notch4",
    color: "#fb7185",
    geometry: { kind: "circle", cx: 226, cy: 232, r: 40 },
    callout: { points: [[186, 232], [118, 232], [100, 214]], x: 94, y: 204, anchor: "end" },
  },
  arm: {
    id: "arm",
    index: "Z-03",
    title: "Arm",
    label: "SYSTEMIC VITALS",
    sublabel: "HR · Radiation dose",
    color: "#fbbf24",
    geometry: { kind: "ellipse", cx: 296, cy: 283, rx: 30, ry: 100, rotate: -6 },
    callout: { points: [[306, 382], [334, 404], [350, 404]], x: 354, y: 401, anchor: "start" },
  },
};

export const ZONE_ORDER: Zone[] = ["head", "chest", "arm"];

const STATUS_HEX: Record<ZoneStatus, string> = {
  nominal: "#34d399",
  watch: "#fbbf24",
  alert: "#f87171",
};

const STARS: ReadonlyArray<readonly [number, number, number, string]> = [
  [-20, 60, 1.2, "3s"],
  [20, 500, 1, "4s"],
  [400, 90, 1.4, "5s"],
  [440, 300, 1, "3.5s"],
  [-30, 380, 1.3, "4.5s"],
  [390, 560, 1, "6s"],
  [60, 24, 0.9, "5.5s"],
  [450, 470, 1.1, "4s"],
  [-36, 560, 1, "3.2s"],
  [455, 180, 0.8, "4.8s"],
];

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

type Paint = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
  filter?: string;
  children?: ReactNode;
};

function Shape({ g, ...p }: { g: Geometry } & Paint) {
  return g.kind === "circle" ? (
    <circle cx={0} cy={0} r={g.r} {...p} />
  ) : (
    <ellipse cx={0} cy={0} rx={g.rx} ry={g.ry} {...p} />
  );
}

export interface AstronautModelProps {
  selectedZone: Zone | null;
  onZoneSelect: (zone: Zone | null) => void;
  statuses?: Partial<Record<Zone, ZoneStatus>>;
  heartRate?: number;
  className?: string;
}

export default function AstronautModel({
  selectedZone,
  onZoneSelect,
  statuses = {},
  heartRate = 70,
  className = "",
}: AstronautModelProps) {
  const [hovered, setHovered] = useState<Zone | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (s: string) => `am-${uid}-${s}`;
  const ref = (s: string) => `url(#${id(s)})`;
  const beat = `${(60 / Math.max(30, Math.min(220, heartRate))).toFixed(3)}s`;

  const toggle = (z: Zone) => onZoneSelect(selectedZone === z ? null : z);
  const onKey = (e: KeyboardEvent<SVGGElement>, z: Zone) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(z);
    } else if (e.key === "Escape") {
      onZoneSelect(null);
    }
  };
  const isOn = (z: Zone) => hovered === z || selectedZone === z;
  const headOn = isOn("head");
  const chestOn = isOn("chest");
  const armOn = isOn("arm");
  const suit = ref("suit");
  const fade = { transition: "opacity 300ms ease, stroke 300ms ease" };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {/* HUD frame */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
          <span className="absolute left-0 top-0 h-5 w-5 border-l border-t border-cyan-400/50" />
          <span className="absolute right-0 top-0 h-5 w-5 border-r border-t border-cyan-400/50" />
          <span className="absolute bottom-0 left-0 h-5 w-5 border-b border-l border-cyan-400/50" />
          <span className="absolute bottom-0 right-0 h-5 w-5 border-b border-r border-cyan-400/50" />
          <div className="absolute left-3 top-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </span>
            Biometric scan
          </div>
          <div className="absolute right-3 top-3 font-mono text-[10px] uppercase tracking-[0.2em] text-rose-300/80">
            ♥ {Math.round(heartRate)} bpm
          </div>
          {!selectedZone && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 animate-pulse whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Select a zone to inspect
            </div>
          )}
        </div>

        <svg
          viewBox="-50 0 520 620"
          className="relative mx-auto block h-auto w-full max-w-[560px] select-none"
          role="group"
          aria-label="Interactive astronaut model"
        >
          <defs>
            <linearGradient id={id("suit")} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="55%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <radialGradient id={id("visor")} cx="35%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
              <stop offset="45%" stopColor="#0c4a6e" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
            <radialGradient id={id("aura")} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0891b2" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#0e7490" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={id("platform")} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={id("scan")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
              <stop offset="85%" stopColor="#22d3ee" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.5" />
            </linearGradient>
            <pattern id={id("grid")} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.5" />
            </pattern>
            <filter id={id("glow")} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id={id("visorClip")}>
              <ellipse cx="210" cy="108" rx="48" ry="42" />
            </clipPath>
          </defs>

          {/* Backdrop */}
          <rect x="-50" y="0" width="520" height="620" fill={ref("grid")} opacity="0.55" />
          <circle cx="210" cy="300" r="260" fill={ref("aura")} />
          <circle cx="210" cy="300" r="232" fill="none" stroke="#1e293b" />
          <circle cx="210" cy="300" r="268" fill="none" stroke="#22d3ee" strokeOpacity="0.22" strokeDasharray="2 10">
            <animateTransform attributeName="transform" type="rotate" from="0 210 300" to="360 210 300" dur="90s" repeatCount="indefinite" />
          </circle>
          {STARS.map(([x, y, r, d], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#e2e8f0">
              <animate attributeName="opacity" values="0.15;0.9;0.15" dur={d} repeatCount="indefinite" />
            </circle>
          ))}

          {/* Platform */}
          <ellipse cx="210" cy="574" rx="140" ry="18" fill={ref("platform")} />
          <ellipse cx="210" cy="574" rx="118" ry="12" fill="none" stroke="#22d3ee" strokeOpacity="0.5" strokeDasharray="6 8">
            <animate attributeName="stroke-dashoffset" values="0;-28" dur="2s" repeatCount="indefinite" />
          </ellipse>

          {/* ───────── Astronaut ───────── */}
          <g>
            {/* PLSS backpack */}
            <rect x="134" y="148" width="152" height="198" rx="22" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
            <rect x="146" y="140" width="10" height="16" rx="3" fill="#334155" />
            <rect x="264" y="140" width="10" height="16" rx="3" fill="#334155" />

            {/* Legs */}
            <path d="M160 350 L208 350 L203 520 Q202 530 192 530 L172 530 Q162 530 162 520 Z" fill={suit} stroke="#64748b" strokeOpacity="0.5" />
            <path d="M212 350 L260 350 L258 520 Q258 530 248 530 L228 530 Q218 530 217 520 Z" fill={suit} stroke="#64748b" strokeOpacity="0.5" />
            <rect x="166" y="428" width="36" height="22" rx="9" fill="#cbd5e1" opacity="0.55" stroke="#64748b" strokeOpacity="0.5" />
            <rect x="218" y="428" width="36" height="22" rx="9" fill="#cbd5e1" opacity="0.55" stroke="#64748b" strokeOpacity="0.5" />
            <rect x="164" y="380" width="18" height="24" rx="3" fill="#94a3b8" opacity="0.5" />
            <rect x="238" y="380" width="18" height="24" rx="3" fill="#94a3b8" opacity="0.5" />

            {/* Boots */}
            <path d="M206 524 h-48 q-16 0 -16 18 v6 q0 8 8 8 h48 q8 0 8 -8 Z" fill="#334155" stroke="#475569" />
            <path d="M214 524 h48 q16 0 16 18 v6 q0 8 -8 8 h-48 q-8 0 -8 -8 Z" fill="#334155" stroke="#475569" />
            <path d="M144 549 h60 M216 549 h60" stroke="#0f172a" strokeWidth="3" />

            {/* Left arm (viewer) */}
            <path d="M154 188 Q126 192 118 222 L106 330 Q105 342 117 344 L131 344 Q141 343 142 332 L152 250 Z" fill={suit} stroke="#64748b" strokeOpacity="0.5" />
            <path d="M112 272 Q126 278 146 272" stroke="#64748b" strokeOpacity="0.6" fill="none" />
            <rect x="104" y="336" width="38" height="10" rx="4" fill="#475569" />
            <circle cx="122" cy="358" r="17" fill="#cbd5e1" stroke="#64748b" />

            {/* Right arm (interactive) */}
            <path
              d="M266 188 Q294 192 302 222 L314 330 Q315 342 303 344 L289 344 Q279 343 278 332 L268 250 Z"
              fill={suit}
              stroke={armOn ? ZONE_CONFIG.arm.color : "#64748b"}
              strokeOpacity={armOn ? 0.95 : 0.5}
              strokeWidth={armOn ? 1.6 : 1}
              style={fade}
            />
            <path d="M274 272 Q294 278 308 272" stroke="#64748b" strokeOpacity="0.6" fill="none" />
            {/* Dosimeter */}
            <g transform="rotate(-8 286 225)">
              <rect x="278" y="214" width="16" height="22" rx="3" fill="#0f172a" stroke={armOn ? ZONE_CONFIG.arm.color : "#475569"} style={fade} />
              <circle cx="286" cy="225" r="3.2" fill="none" stroke={armOn ? "#fde68a" : "#64748b"} strokeWidth="1" />
              <circle cx="286" cy="225" r="1" fill={armOn ? "#fde68a" : "#64748b"} />
            </g>
            {/* Wrist bio-monitor */}
            <g transform="rotate(-4 297 328)">
              <rect x="278" y="322" width="38" height="12" rx="4" fill="#0f172a" stroke={armOn ? ZONE_CONFIG.arm.color : "#475569"} style={fade} />
              <polyline points="283,328 289,328 291,324 293,332 295,328 300,328" fill="none" stroke={armOn ? "#fbbf24" : "#475569"} strokeWidth="1" />
              <circle cx="308" cy="328" r="2.2" fill={armOn ? "#fbbf24" : "#78716c"}>
                {armOn && <animate attributeName="opacity" values="1;0.15;1" dur={beat} repeatCount="indefinite" />}
              </circle>
            </g>
            <rect x="280" y="336" width="38" height="10" rx="4" fill="#475569" />
            <circle cx="298" cy="358" r="17" fill="#cbd5e1" stroke="#64748b" />

            {/* Torso */}
            <path d="M152 186 Q152 168 172 166 L248 166 Q268 168 268 186 L266 352 Q266 366 252 366 L168 366 Q154 366 154 352 Z" fill={suit} stroke="#64748b" strokeOpacity="0.5" />
            <path d="M240 170 Q262 172 264 190 L262 350 Q262 360 252 362 L240 362 Z" fill="#334155" opacity="0.25" />
            <rect x="150" y="334" width="120" height="16" rx="6" fill="#475569" />
            <path d="M176 312 Q150 318 160 338" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M244 312 Q270 318 260 338" stroke="#94a3b8" strokeOpacity="0.5" strokeWidth="3" fill="none" strokeLinecap="round" />

            {/* Mission patch (generic) */}
            <circle cx="176" cy="196" r="11" fill="#0f172a" stroke="#64748b" />
            <path d="M176 189 l2 5 5 0.4 -4 3.3 1.4 5 -4.4 -2.8 -4.4 2.8 1.4 -5 -4 -3.3 5 -0.4 Z" fill="#22d3ee" opacity="0.75" />
            <rect x="236" y="186" width="24" height="7" rx="1.5" fill="#0f172a" opacity="0.6" />

            {/* Great vessels */}
            <g opacity={chestOn ? 0.95 : 0.18} style={fade} stroke="#fb7185" strokeWidth="1.6" fill="none" strokeLinecap="round">
              <path d="M226 220 C 226 204 236 196 250 192" />
              <path d="M222 222 C 212 208 198 202 184 200" />
              <path d="M230 222 C 236 210 244 206 258 206" />
              <path d="M226 244 L 226 270" />
              <path d="M218 238 C 206 246 196 256 190 268" />
              {chestOn && (
                <>
                  <path d="M226 220 C 226 204 236 196 250 192" stroke="#fecdd3" strokeWidth="2" strokeDasharray="4 34">
                    <animate attributeName="stroke-dashoffset" values="38;0" dur={beat} repeatCount="indefinite" />
                  </path>
                  <path d="M222 222 C 212 208 198 202 184 200" stroke="#fecdd3" strokeWidth="2" strokeDasharray="4 40">
                    <animate attributeName="stroke-dashoffset" values="44;0" dur={beat} repeatCount="indefinite" />
                  </path>
                </>
              )}
            </g>

            {/* Heart */}
            <g transform="translate(226 230)">
              <g>
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;1.16;1;1.08;1"
                  keyTimes="0;0.15;0.3;0.45;1"
                  dur={beat}
                  repeatCount="indefinite"
                />
                <path
                  d="M0 9 C -12 0 -15 -9 -8 -13 C -4 -15.5 -1 -13.5 0 -10.5 C 1 -13.5 4 -15.5 8 -13 C 15 -9 12 0 0 9 Z"
                  fill="#fb7185"
                  opacity={chestOn ? 0.95 : 0.4}
                  filter={chestOn ? ref("glow") : undefined}
                  style={fade}
                />
              </g>
            </g>

            {/* Display & control module */}
            <rect x="180" y="274" width="60" height="38" rx="6" fill="#0f172a" stroke="#475569" />
            <polyline
              points="185,292 195,292 199,284 203,300 207,288 211,292 235,292"
              fill="none"
              stroke="#34d399"
              strokeWidth="1.4"
              strokeLinejoin="round"
              strokeDasharray="80 80"
            >
              <animate attributeName="stroke-dashoffset" values="80;0;-80" dur="2.4s" repeatCount="indefinite" />
            </polyline>
            <circle cx="188" cy="305" r="2" fill="#f59e0b" />
            <circle cx="195" cy="305" r="2" fill="#22d3ee" />
            <circle cx="202" cy="305" r="2" fill="#64748b" />

            {/* Neck ring */}
            <ellipse cx="210" cy="168" rx="46" ry="9" fill="#334155" stroke="#64748b" />

            {/* Helmet */}
            <circle cx="210" cy="104" r="64" fill={suit} stroke="#64748b" strokeOpacity="0.6" />
            <rect x="200" y="36" width="20" height="8" rx="3" fill="#475569" />
            <rect x="148" y="82" width="10" height="22" rx="3" fill="#475569" />
            <rect x="262" y="82" width="10" height="22" rx="3" fill="#475569" />
            <ellipse
              cx="210"
              cy="108"
              rx="48"
              ry="42"
              fill={ref("visor")}
              stroke={headOn ? ZONE_CONFIG.head.color : "#0ea5e9"}
              strokeOpacity={headOn ? 0.95 : 0.4}
              strokeWidth="1.5"
              style={fade}
            />
            <g clipPath={ref("visorClip")}>
              {/* Neurovascular network (BBB) */}
              <g opacity={headOn ? 0.9 : 0.12} style={fade}>
                <g stroke="#a78bfa" strokeWidth="0.8">
                  <line x1="186" y1="84" x2="200" y2="76" />
                  <line x1="200" y1="76" x2="220" y2="78" />
                  <line x1="220" y1="78" x2="236" y2="88" />
                  <line x1="200" y1="76" x2="210" y2="92" />
                  <line x1="220" y1="78" x2="210" y2="92" />
                  <line x1="186" y1="84" x2="210" y2="92" />
                  <line x1="210" y1="92" x2="236" y2="88" />
                </g>
                {[
                  [186, 84],
                  [200, 76],
                  [220, 78],
                  [236, 88],
                  [210, 92],
                ].map(([x, y]) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="#c4b5fd" />
                ))}
              </g>
              {/* Eyes / retina */}
              {[194, 226].map((cx) => (
                <g key={cx} style={fade}>
                  <ellipse cx={cx} cy="112" rx="8" ry="4.5" fill="#22d3ee" opacity={headOn ? 0.35 : 0.1} />
                  <circle cx={cx} cy="112" r="3" fill="#67e8f9" opacity={headOn ? 1 : 0.25} filter={headOn ? ref("glow") : undefined} />
                  {headOn && (
                    <g stroke="#f87171" strokeWidth="0.5" opacity="0.8" fill="none">
                      <path d={`M${cx} 112 q -4 -2 -7 -1`} />
                      <path d={`M${cx} 112 q 4 2 7 1`} />
                      <path d={`M${cx} 112 q 3 -3 6 -3`} />
                    </g>
                  )}
                </g>
              ))}
              {headOn && (
                <rect x="160" y="64" width="100" height="2.5" fill="#22d3ee" opacity="0.55">
                  <animateTransform attributeName="transform" type="translate" values="0 0; 0 86; 0 0" dur="2.4s" repeatCount="indefinite" />
                </rect>
              )}
              <path d="M176 92 Q186 72 210 68" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M240 134 Q250 124 253 112" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </g>
          </g>

          {/* Scan sweep */}
          <rect x="-50" y="-40" width="520" height="40" fill={ref("scan")} pointerEvents="none">
            <animateTransform attributeName="transform" type="translate" values="0 0; 0 660" dur="7s" repeatCount="indefinite" />
          </rect>

          {/* ───────── Interactive zones ───────── */}
          {ZONE_ORDER.map((z) => {
            const c = ZONE_CONFIG[z];
            const g = c.geometry;
            const sel = selectedZone === z;
            const on = isOn(z);
            const st = statuses[z] ?? "nominal";
            const rot = g.kind === "ellipse" ? g.rotate : 0;
            const R = g.kind === "circle" ? { x: g.r, y: g.r } : { x: g.rx, y: g.ry };
            const [p0] = c.callout.points;
            return (
              <g
                key={z}
                role="button"
                tabIndex={0}
                aria-label={`${c.title}: ${c.sublabel}. Status ${st}.`}
                aria-pressed={sel}
                className="cursor-pointer outline-none"
                onClick={() => toggle(z)}
                onKeyDown={(e) => onKey(e, z)}
                onMouseEnter={() => setHovered(z)}
                onMouseLeave={() => setHovered((h) => (h === z ? null : h))}
                onFocus={() => setHovered(z)}
                onBlur={() => setHovered((h) => (h === z ? null : h))}
              >
                <g transform={`translate(${g.cx} ${g.cy}) rotate(${rot})`}>
                  <Shape g={g} fill={c.color} opacity={on ? 0.12 : 0.025} />
                  <Shape
                    g={g}
                    fill="none"
                    stroke={c.color}
                    strokeWidth={sel ? 2 : 1.4}
                    strokeDasharray={sel ? undefined : "5 7"}
                    opacity={on ? 1 : 0.45}
                    filter={on ? ref("glow") : undefined}
                  >
                    {!sel && <animate attributeName="stroke-dashoffset" values="0;-24" dur={on ? "0.8s" : "3s"} repeatCount="indefinite" />}
                  </Shape>
                  {on && (
                    <g pointerEvents="none">
                      <Shape g={g} fill="none" stroke={c.color} strokeWidth={2} />
                      <animateTransform attributeName="transform" type="scale" values="1;1.22" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.9;0" dur="1.6s" repeatCount="indefinite" />
                    </g>
                  )}
                  {sel && (
                    <g stroke={c.color} strokeWidth={2} strokeLinecap="round" pointerEvents="none">
                      <line x1={0} y1={-R.y - 12} x2={0} y2={-R.y - 4} />
                      <line x1={0} y1={R.y + 4} x2={0} y2={R.y + 12} />
                      <line x1={-R.x - 12} y1={0} x2={-R.x - 4} y2={0} />
                      <line x1={R.x + 4} y1={0} x2={R.x + 12} y2={0} />
                    </g>
                  )}
                </g>

                <g opacity={on ? 1 : 0.65} style={{ transition: "opacity 200ms ease" }}>
                  <polyline
                    points={c.callout.points.map((p) => p.join(",")).join(" ")}
                    fill="none"
                    stroke={c.color}
                    strokeWidth={1}
                    strokeOpacity={0.8}
                  />
                  <circle cx={p0[0]} cy={p0[1]} r={2.5} fill={c.color} />
                  <text x={c.callout.x} y={c.callout.y} textAnchor={c.callout.anchor} fill={c.color} fontSize={10} fontWeight={700} letterSpacing={1.2} fontFamily={MONO}>
                    {c.label}
                  </text>
                  <text x={c.callout.x} y={c.callout.y + 13} textAnchor={c.callout.anchor} fill="#94a3b8" fontSize={9} fontFamily={MONO}>
                    {c.sublabel}
                  </text>
                  <text x={c.callout.x} y={c.callout.y + 26} textAnchor={c.callout.anchor} fill={STATUS_HEX[st]} fontSize={9} fontWeight={600} fontFamily={MONO}>
                    ● {st.toUpperCase()}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Zone selector chips (mirror of SVG hotspots) */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {ZONE_ORDER.map((z) => {
          const c = ZONE_CONFIG[z];
          const sel = selectedZone === z;
          const st = statuses[z] ?? "nominal";
          return (
            <button
              key={z}
              type="button"
              onClick={() => toggle(z)}
              onMouseEnter={() => setHovered(z)}
              onMouseLeave={() => setHovered((h) => (h === z ? null : h))}
              aria-pressed={sel}
              className={`group relative overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                sel ? "bg-slate-800/90" : "border-slate-700/60 bg-slate-900/60 hover:border-slate-500/60 hover:bg-slate-800/60"
              }`}
              style={sel ? { borderColor: c.color, boxShadow: `0 0 24px -6px ${c.color}` } : undefined}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.2em]" style={{ color: c.color }}>
                  {c.index}
                </span>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_HEX[st], boxShadow: `0 0 8px ${STATUS_HEX[st]}` }} />
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-100">{c.title}</p>
              <p className="truncate text-[10px] text-slate-500">{c.sublabel}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}