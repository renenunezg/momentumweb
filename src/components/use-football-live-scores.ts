"use client";

import { useEffect, useState, type RefObject } from "react";
import type { FootballLeague } from "@/lib/football-slates";
import {
  FOOTBALL_SVG,
  fieldSvg,
  liveGameKey,
  pollPlan,
  scoreboardDates,
  POLL_MS,
  type LiveGame,
  type LiveGameRef,
  type PollPlan,
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
    // Development only: /cfb/schedule?simulate=1 asks the route for moving
    // synthetic states and polls regardless of kickoffs.
    const simulate =
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).get("simulate") === "1";
    let timer: ReturnType<typeof setTimeout> | null = null;
    // A visibility change during an in-flight read starts a fresh tick; the
    // older one must not schedule a second chain when its read returns.
    let generation = 0;
    // The loop's own view of the scores, so planning never waits on a render.
    let current = new Map<string, LiveGame>();

    async function fetchOnce() {
      try {
        const res = await fetch(
          `/${league}/api/live-scores?dates=${dates}${simulate ? "&simulate=1" : ""}`,
          {
            cache: "no-store",
          },
        );
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
      const plan: PollPlan = simulate
        ? { action: "poll" }
        : pollPlan(refs, current, fetched, Date.now());
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

const PARTS = {
  detail: "font-mono text-[11px] uppercase tracking-wider",
  situation: "text-[11px] text-muted-foreground",
  field: "h-2 w-24 text-muted-foreground",
} as const;
const SIDES = ["away", "home"] as const;

// Server-rendered schedule rows carry data-live keys; the scoreboard is
// written into them in place, so a 170 row table never becomes 170 client
// components. Each side's score, with a dot when it has the ball, goes at the
// end of its team cell; the kickoff cell shows the clock, down and distance,
// and the field strip. Elements are built the first time a row needs them
// and only their text changes after that.
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
      const time = row.querySelector<HTMLTimeElement>('time[data-kickoff="time"]');
      if (!game || game.state === "pre" || !time) continue;

      for (const side of SIDES) {
        const cell = row.querySelector<HTMLElement>(`[data-team-cell="${side}"]`);
        if (!cell) continue;
        let score = cell.querySelector<HTMLElement>("[data-live-score]");
        if (!score) {
          score = document.createElement("span");
          score.dataset.liveScore = "";
          score.className =
            "ml-auto flex items-center gap-1.5 pl-3 font-mono text-sm font-bold tabular-nums";
          const ball = document.createElement("span");
          ball.className = "inline-block h-[18px] w-[18px]";
          ball.innerHTML = FOOTBALL_SVG;
          score.append(ball, document.createElement("span"));
          cell.append(score);
        }
        const ball = game.state === "in" && game.possession === side;
        (score.firstElementChild as HTMLElement).hidden = !ball;
        score.lastElementChild!.textContent = String(game[`${side}_score`] ?? 0);
      }

      let block = row.querySelector<HTMLElement>("[data-live-block]");
      if (!block) {
        block = document.createElement("span");
        block.dataset.liveBlock = "";
        block.className = "flex flex-col items-center gap-0.5";
        block.setAttribute("aria-live", "polite");
        for (const part of Object.keys(PARTS) as (keyof typeof PARTS)[]) {
          const span = document.createElement("span");
          span.dataset.livePart = part;
          span.className = PARTS[part];
          block.append(span);
        }
        time.after(block);
        time.hidden = true;
      }
      const part = (name: keyof typeof PARTS) =>
        block.querySelector<HTMLElement>(`[data-live-part="${name}"]`)!;
      part("detail").textContent = game.detail ?? "";
      part("detail").classList.toggle("text-positive", game.state === "in");
      // The strip shows the spot, so the text keeps only the down and distance.
      const downDistance =
        game.state === "in" ? (game.situation?.replace(/ at .*$/, "") ?? null) : null;
      part("situation").textContent = downDistance ?? "";
      part("situation").hidden = !downDistance;
      const svg = fieldSvg(game);
      part("field").innerHTML = svg ?? "";
      part("field").hidden = !svg;
    }
  }, [container, live]);
}
