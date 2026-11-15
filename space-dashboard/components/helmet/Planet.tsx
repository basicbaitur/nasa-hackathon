"use client";

import { useEffect, useRef } from "react";

type Vec3 = readonly [number, number, number];
const SUN_TOP_LEFT: Vec3 = [-0.62, -0.42, 0.66];
const DUSTY: Vec3 = [255, 150, 110];

/**
 * Real spherical projection of an equirectangular texture onto a lit globe.
 * Lat/lon and lighting are precomputed once; each frame only shifts the longitude,
 * so a 512 px globe costs a few ms per frame.
 */
export default function Planet({
  src,
  res = 440,
  light = SUN_TOP_LEFT,
  secondsPerTurn = 240,
  atmosphere = DUSTY,
  tilt = 0.32,
  className = "",
  label,
}: {
  src: string;
  res?: number;
  /** pass a module-level constant: it is an effect dependency */
  light?: Vec3;
  secondsPerTurn?: number;
  atmosphere?: Vec3;
  tilt?: number;
  className?: string;
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: false })!;
    const N = res;
    canvas.width = N;
    canvas.height = N;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let alive = true;

    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img.onload = () => {
      if (!alive) return;
      const TW = img.naturalWidth;
      const TH = img.naturalHeight;
      const tc = document.createElement("canvas");
      tc.width = TW;
      tc.height = TH;
      const tctx = tc.getContext("2d")!;
      tctx.drawImage(img, 0, 0);
      const tex = new Uint32Array(tctx.getImageData(0, 0, TW, TH).data.buffer);

      // Precompute per-pixel texture coords + shading.
      const R = N / 2 - 6;
      const L = Math.hypot(light[0], light[1], light[2]);
      const [lx, ly, lz] = light.map((v) => v / L);
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const idx: number[] = [];
      const baseU: number[] = [];
      const rowV: number[] = [];
      const shade: number[] = [];
      const rim: number[] = [];
      for (let py = 0; py < N; py++) {
        for (let px = 0; px < N; px++) {
          const x = (px - N / 2) / R;
          const y = (py - N / 2) / R;
          const d2 = x * x + y * y;
          if (d2 > 1) continue;
          const z = Math.sqrt(1 - d2);
          // axial tilt (rotate around view z)
          const xr = x * ct - y * st;
          const yr = x * st + y * ct;
          const lon = Math.atan2(xr, z);
          const lat = Math.asin(Math.max(-1, Math.min(1, yr)));
          const u = ((lon / (2 * Math.PI) + 0.5) * TW) | 0;
          const v = Math.min(TH - 1, ((lat / Math.PI + 0.5) * TH) | 0);
          const lambert = x * lx + y * ly + z * lz;
          const lit = Math.max(0, lambert);
          // soft terminator + faint earthshine on the night side
          const s = Math.min(1.25, 0.04 + Math.pow(lit, 0.85) * 1.18);
          idx.push(py * N + px);
          baseU.push(u);
          rowV.push(v * TW);
          shade.push(s);
          rim.push(Math.pow(1 - z, 3) * Math.max(0.15, lit + 0.25));
        }
      }
      const count = idx.length;
      const out = ctx.createImageData(N, N);
      const buf = new Uint32Array(out.data.buffer);
      const [ar, ag, ab] = atmosphere;

      let last = 0;
      const t0 = performance.now();
      const draw = (now: number) => {
        if (!alive) return;
        raf = requestAnimationFrame(draw);
        if (now - last < 1000 / 24) return; // 24 fps is plenty for a slow globe
        last = now;
        const turn = reduce ? 0.2 : ((now - t0) / 1000 / secondsPerTurn) % 1;
        const off = (turn * TW) | 0;
        for (let i = 0; i < count; i++) {
          let u = baseU[i] + off;
          if (u >= TW) u -= TW;
          const c = tex[rowV[i] + u];
          const s = shade[i];
          const a = rim[i] * 2.4;
          const r = Math.min(255, (c & 255) * s + ar * a);
          const g = Math.min(255, ((c >> 8) & 255) * s + ag * a);
          const b = Math.min(255, ((c >> 16) & 255) * s + ab * a);
          buf[idx[i]] = (255 << 24) | (b << 16) | (g << 8) | r;
        }
        ctx.putImageData(out, 0, 0);
      };
      raf = requestAnimationFrame(draw);
    };
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [src, res, light, secondsPerTurn, atmosphere, tilt]);

  return <canvas ref={ref} role="img" aria-label={label} className={className} />;
}
