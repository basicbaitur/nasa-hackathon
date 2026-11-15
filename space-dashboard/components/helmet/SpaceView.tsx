"use client";

import { useEffect, useRef } from "react";
import Planet from "./Planet";
import { look } from "./look";

/** Where the Sun sits inside the (oversized) world layer, as a fraction of its box. */
const SUN = { x: 0.21, y: 0.25 };
const MARS_LIGHT = [-0.7, -0.5, 0.52] as const;

/**
 * Everything outside the visor: Milky Way, parallax starfield, the Sun, Mars, a distant Earth.
 * During a solar particle event the Sun flares, protons stream past and the astronaut sees
 * "light flashes" (cosmic-ray phosphenes reported by real crews).
 */
export default function SpaceView({ sunEvent, linkUp, delayMin }: { sunEvent: boolean; linkUp: boolean; delayMin: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sunRef = useRef(sunEvent);
  useEffect(() => {
    sunRef.current = sunEvent;
  }, [sunEvent]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(1.75, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;
    type Star = { x: number; y: number; r: number; d: number; tw: number; c: string };
    let stars: Star[] = [];
    const COLORS = ["#ffffff", "#ffffff", "#dbeeff", "#fff3e0", "#cfe3ff", "#ffe2c4"];
    const resize = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((W * H) / 2600);
      stars = Array.from({ length: n }, () => {
        const d = Math.random();
        return {
          x: Math.random() * W,
          y: Math.random() * H,
          r: d > 0.97 ? 1.6 + Math.random() : 0.35 + d * 0.95,
          d: 0.15 + d * 0.85,
          tw: Math.random() * Math.PI * 2,
          c: COLORS[(Math.random() * COLORS.length) | 0],
        };
      });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; w: number };
    let protons: P[] = [];
    let flashes: { x: number; y: number; life: number; len: number; a: number }[] = [];
    let debris: P | null = null;
    let raf = 0;
    let prev = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const t = now / 1000;
      ctx.clearRect(0, 0, W, H);
      const ox = -look.x * 26;
      const oy = -look.y * 18;

      // Stars: deeper = less parallax.
      for (const s of stars) {
        const tw = reduce ? 0.85 : 0.6 + 0.4 * Math.sin(t * (0.6 + s.d) + s.tw);
        let x = (s.x + ox * s.d) % W;
        let y = (s.y + oy * s.d) % H;
        if (x < 0) x += W;
        if (y < 0) y += H;
        ctx.globalAlpha = tw * (0.35 + s.d * 0.65);
        ctx.fillStyle = s.c;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.5) {
          ctx.globalAlpha = tw * 0.25;
          ctx.fillRect(x - s.r * 4, y - 0.3, s.r * 8, 0.6);
          ctx.fillRect(x - 0.3, y - s.r * 4, 0.6, s.r * 8);
        }
      }
      ctx.globalAlpha = 1;

      const sx = SUN.x * W;
      const sy = SUN.y * H;
      ctx.globalCompositeOperation = "lighter";

      // Solar particle event: protons stream out of the Sun.
      if (sunRef.current && !reduce) {
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * 1.3 - 0.05; // mostly toward the viewer's right/down
          const sp = 380 + Math.random() * 520;
          protons.push({ x: sx, y: sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 1.4 + Math.random() * 1.6, w: 0.6 + Math.random() * 1.4 });
        }
        if (Math.random() < 0.09) flashes.push({ x: Math.random() * W, y: Math.random() * H, life: 0, len: 6 + Math.random() * 40, a: Math.random() * Math.PI });
      }
      protons = protons.filter((p) => (p.life += dt) < p.max);
      for (const p of protons) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const k = 1 - p.life / p.max;
        ctx.strokeStyle = `rgba(255,${170 + ((k * 60) | 0)},90,${0.55 * k})`;
        ctx.lineWidth = p.w;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
        ctx.stroke();
      }
      // Cosmic-ray light flashes: brief white streaks "inside the eye".
      flashes = flashes.filter((f) => (f.life += dt) < 0.18);
      for (const f of flashes) {
        const k = 1 - f.life / 0.18;
        ctx.strokeStyle = `rgba(235,245,255,${0.9 * k})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x + Math.cos(f.a) * f.len, f.y + Math.sin(f.a) * f.len);
        ctx.stroke();
      }

      // A rare micrometeoroid streak.
      if (!reduce && !debris && Math.random() < 0.0025) {
        const fromLeft = Math.random() < 0.5;
        debris = { x: fromLeft ? -40 : W + 40, y: Math.random() * H * 0.6, vx: (fromLeft ? 1 : -1) * (900 + Math.random() * 600), vy: 120 + Math.random() * 240, life: 0, max: 2.5, w: 1.2 };
      }
      if (debris) {
        debris.life += dt;
        debris.x += debris.vx * dt;
        debris.y += debris.vy * dt;
        const g = ctx.createLinearGradient(debris.x, debris.y, debris.x - debris.vx * 0.12, debris.y - debris.vy * 0.12);
        g.addColorStop(0, "rgba(255,255,255,0.9)");
        g.addColorStop(1, "rgba(160,210,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(debris.x, debris.y);
        ctx.lineTo(debris.x - debris.vx * 0.12, debris.y - debris.vy * 0.12);
        ctx.stroke();
        if (debris.life > debris.max) debris = null;
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="helmet-world pointer-events-none absolute inset-[-7%]">
      {/* Milky Way photo-texture, slowly turning */}
      <div className="milky-way absolute inset-[-25%]" aria-hidden />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />

      {/* The Sun */}
      <div className={`sun ${sunEvent ? "sun-flare" : ""}`} style={{ left: `${SUN.x * 100}%`, top: `${SUN.y * 100}%` }} aria-hidden>
        <div className="sun-halo" />
        <div className="sun-rays" />
        <div className="sun-disc" />
      </div>

      {/* Distant Earth with a HUD target marker */}
      <div className="absolute" style={{ left: "36%", top: "33%" }}>
        <div className="earth-dot" aria-hidden />
        <div className="world-tag" style={{ ["--tag" as string]: linkUp ? "#4CC9F0" : "#FF7A7A" }}>
          <span className="world-bracket" aria-hidden />
          <span className="world-label">
            EARTH · {linkUp ? `LINK UP · ${delayMin} MIN` : "LOS"}
          </span>
        </div>
      </div>

      {/* Mars, rendered as a real lit globe */}
      <div className="mars-wrap absolute" style={{ left: "61%", top: "52%" }}>
        <div className="mars-glow" aria-hidden />
        <Planet src="/space/2k_mars.jpg" label="Mars, mission destination" light={MARS_LIGHT} secondsPerTurn={300} className="mars-globe" />
        <div className="world-tag world-tag-mars" style={{ ["--tag" as string]: "#FFB454" }}>
          <span className="world-label">MARS · ARES-IV TARGET · 4.2 M km</span>
        </div>
      </div>
    </div>
  );
}
