"use client";

import { useEffect, useRef, useState } from "react";
import { useChartTheme } from "@/lib/chart-theme";

// A right-handed hitter's barrel path drawn as a hoop tilted by the swing path tilt, in a small perspective projection
// the reader can orbit. Frame: x toward first base, y toward the pitcher, z up (meters).

export interface Hoop {
  tilt: number;
  color: string;
  dashed?: boolean;
}

type Vec = [number, number, number];

const CONTACT: Vec = [0, 0.35, 0.85];
const RADIUS = 1.0;
const VIEWS: { label: string; az: number; el: number }[] = [
  { label: "3/4 view", az: 34, el: 22 },
  { label: "Behind the catcher", az: 0, el: 4 },
  { label: "From the side", az: 90, el: 4 },
  { label: "Overhead", az: 0, el: 86 },
];

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec): Vec => {
  const l = Math.hypot(...a);
  return [a[0] / l, a[1] / l, a[2] / l];
};

function hoopPoint(tilt: number, angle: number): Vec {
  const r = (tilt * Math.PI) / 180;
  const n: Vec = [-Math.cos(r), 0, Math.sin(r)];
  const c: Vec = [CONTACT[0] + RADIUS * n[0], CONTACT[1], CONTACT[2] + RADIUS * n[2]];
  const p = (angle * Math.PI) / 180;
  return [c[0] - RADIUS * n[0] * Math.cos(p), c[1] + RADIUS * Math.sin(p), c[2] - RADIUS * n[2] * Math.cos(p)];
}

export function SwingHoop({ hoops, height = 340, label }: { hoops: Hoop[]; height?: number; label: string }) {
  const theme = useChartTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState({ az: 34, el: 22 });
  const viewRef = useRef(view);
  const hoopsRef = useRef(hoops);
  useEffect(() => {
    viewRef.current = view;
    hoopsRef.current = hoops;
  }, [view, hoops]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const { az, el } = viewRef.current;
      const a = (az * Math.PI) / 180;
      const e = (el * Math.PI) / 180;
      const target: Vec = [0, 0.3, 0.9];
      const eye: Vec = [target[0] + 6.2 * Math.sin(a) * Math.cos(e), target[1] - 6.2 * Math.cos(a) * Math.cos(e), target[2] + 6.2 * Math.sin(e)];
      const f = norm(sub(target, eye));
      const r = norm(cross(f, Math.abs(f[2]) > 0.98 ? [0, 1, 0] : [0, 0, 1]));
      const u = cross(r, f);
      const scale = Math.min(w, h) * 1.55;
      const project = (p: Vec): [number, number] => {
        const d = sub(p, eye);
        const z = dot(d, f);
        return [w / 2 + (scale * dot(d, r)) / z, h * 0.56 - (scale * dot(d, u)) / z];
      };
      const path = (pts: Vec[], stroke: string, width: number, dash: number[] = [], fill?: string) => {
        ctx.beginPath();
        pts.forEach((p, i) => {
          const [x, y] = project(p);
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        });
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.setLineDash(dash);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      for (let i = -3; i <= 3; i++) {
        path([[i * 0.6, -1.8, 0], [i * 0.6, 2.4, 0]], theme.grid, 1);
        path([[-1.8, i * 0.6 + 0.3, 0], [1.8, i * 0.6 + 0.3, 0]], theme.grid, 1);
      }
      path([[-0.22, 0.43, 0], [0.22, 0.43, 0], [0.22, 0.22, 0], [0, 0, 0], [-0.22, 0.22, 0], [-0.22, 0.43, 0]], theme.border, 1.5, [], theme.background);
      path([[-0.22, 0.3, 0.5], [0.22, 0.3, 0.5], [0.22, 0.3, 1.07], [-0.22, 0.3, 1.07], [-0.22, 0.3, 0.5]], theme["muted-foreground"], 1, [4, 3]);
      const hx = -0.85;
      path([[hx - 0.18, 0.05, 0], [hx, 0.05, 0.9], [hx + 0.18, 0.05, 0]], theme["muted-foreground"], 4);
      path([[hx, 0.05, 0.9], [hx, 0.05, 1.5]], theme["muted-foreground"], 6);
      path([[hx, 0.05, 1.4], [hx + 0.35, 0.2, 1.15]], theme["muted-foreground"], 3);
      const [hdx, hdy] = project([hx, 0.05, 1.66]);
      ctx.beginPath();
      ctx.arc(hdx, hdy, 7, 0, 7);
      ctx.fillStyle = theme["muted-foreground"];
      ctx.fill();
      const phase = ((now - start) / 1000) % 1.6;
      for (const hoop of hoopsRef.current) {
        const full: Vec[] = [];
        const arc: Vec[] = [];
        for (let g = 0; g <= 360; g += 4) full.push(hoopPoint(hoop.tilt, g));
        for (let g = -150; g <= 110; g += 3) arc.push(hoopPoint(hoop.tilt, g));
        path(full, hoop.color, 1, [3, 4]);
        path(arc, hoop.color, 3, hoop.dashed ? [7, 5] : []);
        const [bx, by] = project(hoopPoint(hoop.tilt, -150 + (phase / 1.6) * 260));
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, 7);
        ctx.fillStyle = hoop.color;
        ctx.fill();
      }
      const [cx, cy] = project(CONTACT);
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, 7);
      ctx.fillStyle = theme.foreground;
      ctx.fill();
      ctx.fillStyle = theme["muted-foreground"];
      ctx.font = "11px var(--font-sans), sans-serif";
      ctx.fillText("contact", cx + 8, cy + 14);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [theme]);

  const drag = useRef<{ x: number; y: number; az: number; el: number } | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Camera">
        {VIEWS.map((v) => (
          <button
            key={v.label}
            type="button"
            aria-pressed={view.az === v.az && view.el === v.el}
            onClick={() => setView({ az: v.az, el: v.el })}
            className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground aria-pressed:border-foreground/50 aria-pressed:text-foreground"
          >
            {v.label}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        style={{ height }}
        className="w-full cursor-grab touch-none rounded-md bg-muted/30"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, ...view };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          setView({ az: d.az + (e.clientX - d.x) * 0.4, el: Math.max(2, Math.min(88, d.el + (e.clientY - d.y) * 0.3)) });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      />
    </div>
  );
}
