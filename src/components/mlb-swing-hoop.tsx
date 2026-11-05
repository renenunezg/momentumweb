"use client";

import { useEffect, useRef, useState } from "react";
import { useChartTheme } from "@/lib/chart-theme";
import { armLine, BAT_KNOB, BAT_LENGTH, CONTACT, hoopArc, hoopPoint, projector, sceneLines, STROKE, type Vec } from "@/lib/swing-hoop-geometry";

// The swing hoop the reader can orbit; the scene's geometry lives in swing-hoop-geometry.

export interface Hoop {
  tilt: number;
  color: string;
  dashed?: boolean;
}

// The bat picture lies along x from the knob (0) to the end cap (400), centered on y = 20. It is stretched to the
// projected bat's length but keeps a fixed on-screen girth, so it reads as a bat at any angle.
const BAT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="40" viewBox="0 0 400 40">
<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#7a4a22"/><stop offset="0.28" stop-color="#f0cf9c"/><stop offset="0.55" stop-color="#c98f55"/><stop offset="1" stop-color="#6b3f1c"/>
</linearGradient></defs>
<path d="M4 20C4 12 8 11 12 11L14 11C17 11 18 15.5 22 15.5L130 15.5C190 15.5 220 7 282 6.5L382 6C394 6 396 12 396 20C396 28 394 34 382 34L282 33.5C220 33 190 24.5 130 24.5L22 24.5C18 24.5 17 29 14 29L12 29C8 29 4 28 4 20Z" fill="url(#w)" stroke="#4a2a10" stroke-width="1.2"/>
<path d="M150 18C210 16 240 11 300 10.5L370 10.3" fill="none" stroke="#fff3dd" stroke-opacity="0.5" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;
const BAT_GIRTH_PX = 12;
const VIEWS: { label: string; az: number; el: number }[] = [
  { label: "3/4 view", az: 34, el: 22 },
  { label: "Behind the catcher", az: 0, el: 4 },
  { label: "From the side", az: 90, el: 4 },
  { label: "Overhead", az: 0, el: 86 },
];

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
    const batImage = new Image();
    batImage.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(BAT_SVG)}`;
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
      const project = projector(az, el, w, h);
      // The grip tape carries the swing's color so overlapping bats stay tellable apart.
      const drawBat = (tilt: number, angle: number, color: string) => {
        if (!batImage.naturalWidth) return;
        const [x0, y0] = project(hoopPoint(tilt, angle, BAT_KNOB));
        const [x1, y1] = project(hoopPoint(tilt, angle, BAT_KNOB + BAT_LENGTH));
        ctx.save();
        ctx.translate(x0, y0);
        ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
        const len = Math.hypot(x1 - x0, y1 - y0);
        ctx.scale(len / 400, Math.min(BAT_GIRTH_PX, len / 7) / 28);
        ctx.drawImage(batImage, 0, -20, 400, 40);
        ctx.fillStyle = color;
        ctx.fillRect(24, -4.5, 96, 9);
        ctx.restore();
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
      const scene = sceneLines();
      for (const line of scene.grid) path(line, theme.grid, 1);
      path(scene.plate, theme.border, 1.5, [], theme.background);
      path(scene.zone, theme["muted-foreground"], 1, [4, 3]);
      path(scene.legs, theme["muted-foreground"], 4);
      path(scene.torso, theme["muted-foreground"], 6);
      const [hdx, hdy] = project(scene.head);
      ctx.beginPath();
      ctx.arc(hdx, hdy, 7, 0, 7);
      ctx.fillStyle = theme["muted-foreground"];
      ctx.fill();
      const phase = ((now - start) / 1000) % 1.6;
      const angle = STROKE[0] + (phase / 1.6) * (STROKE[1] - STROKE[0]);
      // One figure holds one bat: it swings the solid hoop, and a dashed (comparison) hoop shows only its sweet spot.
      const batter = hoopsRef.current.find((hoop) => !hoop.dashed) ?? hoopsRef.current[0];
      for (const hoop of hoopsRef.current) {
        path(hoopArc(hoop.tilt, 0, 360, 4), hoop.color, 1, [3, 4]);
        path(hoopArc(hoop.tilt, STROKE[0], STROKE[1], 3), hoop.color, 3, hoop.dashed ? [7, 5] : []);
        if (hoop === batter) continue;
        const [bx, by] = project(hoopPoint(hoop.tilt, angle));
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, 7);
        ctx.fillStyle = hoop.color;
        ctx.fill();
      }
      if (batter) {
        const grip = (t: number) => hoopPoint(batter.tilt, angle, BAT_KNOB + t * BAT_LENGTH);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        path(armLine(batter.tilt, angle, scene.shoulder), theme["muted-foreground"], 3);
        ctx.lineCap = "butt";
        ctx.lineJoin = "miter";
        drawBat(batter.tilt, angle, batter.color);
        for (const t of [0.07, 0.15]) {
          const [gx, gy] = project(grip(t));
          ctx.beginPath();
          ctx.arc(gx, gy, 3.5, 0, 7);
          ctx.fillStyle = theme["muted-foreground"];
          ctx.fill();
        }
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
