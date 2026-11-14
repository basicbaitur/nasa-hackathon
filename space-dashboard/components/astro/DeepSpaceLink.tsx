"use client";

import { useEffect, useRef } from "react";
import type { linkSnapshot } from "@/lib/store";
import { STATUS_COLOR } from "@/components/astro/ui";

export type LinkSnap = ReturnType<typeof linkSnapshot>;

/**
 * Deep-space link visualiser.
 * Live Mars ⇄ Earth light-time channel on a native <canvas>: every digest packet is a dot flying
 * at the real (scaled) light time, the store-and-forward buffer orbits Mars during LOS, ground
 * replies fly back as amber diamonds, and a solar particle event streams from the Sun.
 */
export default function DeepSpaceLink({ link, height = 230 }: { link: LinkSnap; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef(link);
  const offsetRef = useRef(0);

  useEffect(() => {
    linkRef.current = link;
    offsetRef.current = link.serverNow - Date.now();
  }, [link]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    let W = 0;
    let H = height;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim() || "ui-monospace";

    const stars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.1 + 0.2, t: Math.random() * 6 }));
    let particles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

    const resize = () => {
      W = wrap.clientWidth;
      H = height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const planet = (x: number, y: number, r: number, c1: string, c2: string, glow: string) => {
      const halo = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.6);
      halo.addColorStop(0, glow);
      halo.addColorStop(1, "transparent");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // terminator shadow
      const sh = ctx.createLinearGradient(x - r, y, x + r, y);
      sh.addColorStop(0.55, "rgba(0,0,0,0)");
      sh.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = sh;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const label = (text: string, x: number, y: number, color: string, align: CanvasTextAlign = "center", size = 10) => {
      ctx.font = `600 ${size}px ${mono}, ui-monospace, monospace`;
      ctx.textAlign = align;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillText(text, x, y);
      ctx.shadowBlur = 0;
    };

    const draw = (t: number) => {
      const L = linkRef.current;
      const now = Date.now() + offsetRef.current;
      const time = t / 1000;
      ctx.clearRect(0, 0, W, H);

      // stars
      for (const s of stars) {
        ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(time * 0.6 + s.t));
        ctx.fillStyle = "#cfe9ff";
        ctx.fillRect(s.x * W, s.y * H, s.r, s.r);
      }
      ctx.globalAlpha = 1;

      const mars = { x: Math.max(70, W * 0.1), y: H * 0.62, r: 26 };
      const earth = { x: W - Math.max(70, W * 0.1), y: H * 0.62, r: 24 };
      const sun = { x: W * 0.5, y: -H * 0.55 };
      const ctrl = { x: W * 0.5, y: H * 0.12 };
      const bez = (p: number) => {
        const a = 1 - p;
        return { x: a * a * mars.x + 2 * a * p * ctrl.x + p * p * earth.x, y: a * a * mars.y + 2 * a * p * ctrl.y + p * p * earth.y };
      };

      // Sun
      const pulse = L.sunEvent ? 1 + 0.12 * Math.sin(time * 6) : 1;
      const sunR = (L.sunEvent ? 150 : 110) * pulse;
      const sg = ctx.createRadialGradient(sun.x, sun.y, 10, sun.x, sun.y, sunR * 1.9);
      sg.addColorStop(0, L.sunEvent ? "rgba(255,200,120,0.95)" : "rgba(255,220,150,0.7)");
      sg.addColorStop(0.35, L.sunEvent ? "rgba(255,110,60,0.45)" : "rgba(255,180,84,0.18)");
      sg.addColorStop(1, "transparent");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, sunR * 1.9, 0, Math.PI * 2);
      ctx.fill();
      label(L.sunEvent ? "☀ SOLAR PARTICLE EVENT" : "SUN", sun.x, Math.max(14, sun.y + sunR * 0.95 + 26), L.sunEvent ? "#FF7A7A" : "#FFB454");

      // Solar particle stream toward Mars
      if (L.sunEvent && !reduce) {
        for (let i = 0; i < 4; i++) {
          const ang = Math.atan2(mars.y - sun.y, mars.x - sun.x) + (Math.random() - 0.5) * 0.5;
          const sp = 4 + Math.random() * 4;
          particles.push({ x: sun.x + Math.cos(ang) * 40, y: sun.y + Math.sin(ang) * 40, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1 });
        }
      }
      particles = particles.filter((p) => p.life > 0 && p.y < H + 20 && p.x > -20);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.012;
        ctx.strokeStyle = `rgba(255,${120 + Math.floor(p.life * 80)},90,${p.life * 0.8})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
        ctx.stroke();
      }

      // Beam
      ctx.save();
      ctx.lineWidth = 2;
      if (L.linkUp) {
        ctx.strokeStyle = "rgba(76,201,240,0.55)";
        ctx.shadowColor = "#4CC9F0";
        ctx.shadowBlur = 12;
        ctx.setLineDash([10, 8]);
        ctx.lineDashOffset = reduce ? 0 : -time * 30;
      } else {
        ctx.strokeStyle = `rgba(255,122,122,${0.35 + 0.25 * Math.sin(time * 4)})`;
        ctx.setLineDash([3, 9]);
      }
      ctx.beginPath();
      ctx.moveTo(mars.x, mars.y);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y, earth.x, earth.y);
      ctx.stroke();
      ctx.restore();

      // light-time ticks
      if (L.delayMin > 0) {
        for (let i = 1; i < 4; i++) {
          const p = bez(i / 4);
          ctx.fillStyle = "rgba(154,171,196,0.6)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
          if (i !== 2) label(`+${((L.delayMin * i) / 4).toFixed(L.delayMin % 4 ? 1 : 0)}m`, p.x, p.y - 10, "rgba(154,171,196,0.8)", "center", 9);
        }
      }

      const mid = bez(0.5);
      if (!L.linkUp) {
        ctx.strokeStyle = "#FF7A7A";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#FF7A7A";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(mid.x - 9, mid.y - 9);
        ctx.lineTo(mid.x + 9, mid.y + 9);
        ctx.moveTo(mid.x + 9, mid.y - 9);
        ctx.lineTo(mid.x - 9, mid.y + 9);
        ctx.stroke();
        ctx.shadowBlur = 0;
        label("LOSS OF SIGNAL", mid.x, mid.y + 26, "#FF7A7A", "center", 11);
      } else {
        label(L.delayMin ? `ONE-WAY LIGHT TIME ${L.delayMin} MIN` : "ZERO-DELAY TEST LINK", mid.x, mid.y - 14, "#4CC9F0", "center", 10);
      }

      // Planets
      planet(mars.x, mars.y, mars.r, "#ff9a6b", "#8a2b12", L.sunEvent ? "rgba(255,122,122,0.45)" : "rgba(255,120,80,0.22)");
      planet(earth.x, earth.y, earth.r, "#8fd8ff", "#0b3a8a", "rgba(76,201,240,0.28)");
      label("MARS · ARES-IV", mars.x, mars.y + mars.r + 22, "#FFB4A0");
      label("EARTH · DSN", earth.x, earth.y + earth.r + 22, "#9FDcff");

      // Store-and-forward buffer orbiting Mars
      const nBuf = Math.min(L.buffered, 48);
      for (let i = 0; i < nBuf; i++) {
        const ring = i < 24 ? 0 : 1;
        const k = ring ? i - 24 : i;
        const a = (k / Math.min(24, nBuf - ring * 24 || 1)) * Math.PI * 2 + time * (ring ? -0.6 : 0.8);
        const rr = mars.r + 12 + ring * 9;
        ctx.fillStyle = "#FFB454";
        ctx.shadowColor = "#FFB454";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(mars.x + Math.cos(a) * rr, mars.y + Math.sin(a) * rr * 0.8, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (L.buffered) label(`BUFFER ${L.buffered}`, mars.x, mars.y - mars.r - 26, "#FFB454");

      // Uplink held at Earth
      for (let i = 0; i < Math.min(L.uplinkHeld, 12); i++) {
        const a = (i / Math.max(1, L.uplinkHeld)) * Math.PI * 2 - time;
        ctx.fillStyle = "#FFB454";
        ctx.fillRect(earth.x + Math.cos(a) * (earth.r + 12) - 2, earth.y + Math.sin(a) * (earth.r + 10) - 2, 4, 4);
      }
      if (L.uplinkHeld) label(`HELD ${L.uplinkHeld}`, earth.x, earth.y - earth.r - 26, "#FFB454");

      // Downlink packets (Mars → Earth)
      for (const d of L.down) {
        const span = Math.max(1, d.deliverAt - d.sentAt);
        const p = Math.min(1, Math.max(0, (now - d.sentAt) / span));
        const pos = bez(p);
        const c = STATUS_COLOR[d.status];
        for (let k = 1; k <= 4; k++) {
          const tp = bez(Math.max(0, p - k * 0.012));
          ctx.fillStyle = c;
          ctx.globalAlpha = 0.25 / k;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = c;
        ctx.shadowColor = c;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Uplink replies (Earth → Mars)
      for (const u of L.up) {
        const span = Math.max(1, u.deliverAt - u.sentAt);
        const p = Math.min(1, Math.max(0, (now - u.sentAt) / span));
        const pos = bez(1 - p);
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = "#FFB454";
        ctx.shadowColor = "#FFB454";
        ctx.shadowBlur = 16;
        ctx.fillRect(-4.5, -4.5, 9, 9);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [height]);

  const inFlight = link.down.length + link.up.length;
  const summary = `Deep-space link ${link.linkUp ? "up" : "lost"}. One-way light time ${link.delayMin} minutes. ${link.down.length} digests in flight to Earth, ${link.up.length} messages in flight to Mars, ${link.buffered} buffered on board.`;

  return (
    <div className="relative">
      <div ref={wrapRef} className="relative w-full overflow-hidden rounded-xl border border-white/5 bg-black/30">
        <canvas ref={canvasRef} role="img" aria-label={summary} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] uppercase tracking-[0.15em] sm:grid-cols-5">
        {[
          { k: "Link", v: link.linkUp ? "UP" : "LOS", c: link.linkUp ? "#5EE0C1" : "#FF7A7A" },
          { k: "Light time", v: `${link.delayMin} min`, c: "#4CC9F0" },
          { k: "Round trip", v: `${link.delayMin * 2} min`, c: "#4CC9F0" },
          { k: "In flight", v: String(inFlight), c: inFlight ? "#4CC9F0" : "#9AABC4" },
          { k: "Buffered", v: String(link.buffered + link.uplinkHeld), c: link.buffered + link.uplinkHeld ? "#FFB454" : "#9AABC4" },
        ].map((x) => (
          <div key={x.k} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:border-white/15">
            <dt className="text-muted">{x.k}</dt>
            <dd className="mt-0.5 text-sm font-semibold" style={{ color: x.c, textShadow: `0 0 8px ${x.c}88` }}>
              {x.v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
