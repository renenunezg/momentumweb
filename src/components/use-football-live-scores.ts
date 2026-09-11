"use client";

import { useEffect, useState, type RefObject } from "react";
import type { FootballLeague } from "@/lib/football-slates";
import {
  liveGameKey,
  liveLines,
  pollPlan,
  scoreboardDates,
  POLL_MS,
  type LiveGame,
  type LiveGameRef,
} from "@/lib/football-live";

// One poll loop per page. It reads the scoreboard only when a game the page
// shows is live or about to kick off, sleeps until the next kickoff
// otherwise, and stops for good once every game is final, so a page open on
// a weekday makes no requests at all.
//
// `source` is the games to watch, or the container of server-rendered rows
// that carry them as data-live keys; `content` re-runs the loop when a
// server re-render replaced those rows.
export function useFootballLiveScores(
  league: FootballLeague,
  source: LiveGameRef[] | RefObject<HTMLElement | null>,
  content?: unknown,
) {
  const [live, setLive] = useState<Map<string, LiveGame>>(new Map());

  useEffect(() => {
    const refs = Array.isArray(source) ? source : readRows(source);
    if (refs.length === 0) return;
    const dates = scoreboardDates(refs);
    if (!dates) return;
    let cancelled = false;
    let fetched = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // A visibility change during an in-flight read starts a fresh tick; the
    // older one must not schedule a second chain when its read returns.
    let generation = 0;
    // The loop's own view of the scores, so planning never waits on a render.
    let current = new Map<string, LiveGame>();

    async function fetchOnce() {
      try {
        const res = await fetch(`/${league}/api/live-scores?dates=${dates}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { games?: LiveGame[] };
        if (cancelled || !data.games) return;
        fetched = true;
        current = new Map(data.games.map((g) => [liveGameKey(league, g), g]));
        setLive(current);
      } catch {
        // A failed read waits for the next tick.
      }
    }

    function clear() {
      if (timer) clearTimeout(timer);
      timer = null;
    }

    async function tick() {
      clear();
      if (cancelled || document.visibilityState !== "visible") return;
      const plan = pollPlan(refs, current, fetched, Date.now());
      if (plan.action === "stop") return;
      if (plan.action === "wait") {
        timer = setTimeout(tick, plan.delay);
        return;
      }
      const mine = ++generation;
      await fetchOnce();
      if (!cancelled && mine === generation) timer = setTimeout(tick, POLL_MS);
    }

    function onVisibility() {
      if (document.visibilityState === "visible") tick();
      else clear();
    }
    document.addEventListener("visibilitychange", onVisibility);
    tick();

    return () => {
      cancelled = true;
      clear();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [league, source, content]);

  return live;
}

function readRows(container: RefObject<HTMLElement | null>): LiveGameRef[] {
  const rows =
    container.current?.querySelectorAll<HTMLTableRowElement>("tr[data-live]") ?? [];
  return [...rows].map((row) => {
    const time = row.querySelector<HTMLTimeElement>("time[data-kickoff]");
    const start = time?.dateTime ? Date.parse(time.dateTime) : NaN;
    return { key: row.dataset.live!, start: Number.isFinite(start) ? start : null };
  });
}

const LINE_CLASSES = {
  score: "font-mono text-sm font-semibold tabular-nums text-foreground",
  detail: "font-mono text-[10px] uppercase tracking-wider",
  situation: "text-[10px] text-muted-foreground",
} as const;

// Server-rendered schedule rows carry data-live keys; the scoreboard is
// written into their kickoff cells in place, so a 170 row table never
// becomes 170 client components. A live block is built the first time a
// row needs one and only its text changes after that.
export function useLiveScoreRows(
  container: RefObject<HTMLElement | null>,
  league: FootballLeague,
  content: unknown,
) {
  const live = useFootballLiveScores(league, container, content);

  useEffect(() => {
    if (live.size === 0) return;
    const rows =
      container.current?.querySelectorAll<HTMLTableRowElement>("tr[data-live]") ?? [];
    for (const row of rows) {
      const game = live.get(row.dataset.live!);
      const lines = game ? liveLines(game) : null;
      const time = row.querySelector<HTMLTimeElement>('time[data-kickoff="time"]');
      if (!lines || !time) continue;
      let block = row.querySelector<HTMLElement>("[data-live-block]");
      if (!block) {
        block = document.createElement("span");
        block.dataset.liveBlock = "";
        block.className = "flex flex-col items-center gap-0.5";
        block.setAttribute("aria-live", "polite");
        for (const part of Object.keys(LINE_CLASSES) as (keyof typeof LINE_CLASSES)[]) {
          const span = document.createElement("span");
          span.dataset.livePart = part;
          span.className = LINE_CLASSES[part];
          block.append(span);
        }
        time.after(block);
        time.hidden = true;
      }
      for (const part of Object.keys(LINE_CLASSES) as (keyof typeof LINE_CLASSES)[]) {
        const span = block.querySelector<HTMLElement>(`[data-live-part="${part}"]`)!;
        span.textContent = lines[part] ?? "";
        span.hidden = !lines[part];
      }
      block
        .querySelector<HTMLElement>('[data-live-part="detail"]')!
        .classList.toggle("text-positive", game!.state === "in");
    }
  }, [container, live]);
}
