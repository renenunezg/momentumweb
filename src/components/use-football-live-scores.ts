"use client";

import { useEffect, useState, type RefObject } from "react";
import type { FootballLeague } from "@/lib/football-slates";
import {
  FOOTBALL_SVG,
  fieldSvg,
  liveGameKey,
  pollPlan,
  scoreboardDays,
  POLL_MS,
  type LiveGame,
  type LiveGameRef,
  type PollPlan,
} from "@/lib/football-live";

// `content` restarts polling when navigation replaces server-rendered rows.
export function useFootballLiveScores(
  league: FootballLeague,
  source: LiveGameRef[] | RefObject<HTMLElement | null>,
  content?: unknown,
) {
  const [live, setLive] = useState<Map<string, LiveGame>>(new Map());

  useEffect(() => {
    const refs = Array.isArray(source) ? source : readRows(source);
    const days = [...scoreboardDays(refs)].map(([date, refs]) => ({
      date,
      refs,
      keys: new Set(refs.map((ref) => ref.key)),
    }));
    if (days.length === 0) return;
    const controller = new AbortController();
    const fetched = new Set<string>();
    const simulate =
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).get("simulate") === "1";
    let timer: ReturnType<typeof setTimeout> | null = null;
    let fetching = false;
    const current = new Map<string, LiveGame>();

    async function fetchDay({ date, keys }: (typeof days)[number]) {
      try {
        const res = await fetch(
          `/${league}/api/live-scores?dates=${date}${simulate ? "&simulate=1" : ""}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!res.ok) return false;
        const data = (await res.json()) as { games?: LiveGame[] };
        if (controller.signal.aborted || !data.games) return false;
        fetched.add(date);
        for (const game of data.games) {
          const key = liveGameKey(league, game);
          if (keys.has(key)) current.set(key, game);
        }
        return true;
      } catch {
        return false;
      }
    }

    function clear() {
      if (timer) clearTimeout(timer);
      timer = null;
    }

    async function tick() {
      clear();
      if (
        controller.signal.aborted ||
        fetching ||
        document.visibilityState !== "visible"
      ) return;
      const now = Date.now();
      const plans = days.map((day): { day: typeof day; plan: PollPlan } => ({
        day,
        plan: simulate
          ? { action: "poll" }
          : pollPlan(day.refs, current, fetched.has(day.date), now),
      }));
      const due = plans.filter(({ plan }) => plan.action === "poll");
      if (due.length === 0) {
        const delay = Math.min(
          ...plans.map(({ plan }) =>
            plan.action === "wait" ? plan.delay : Infinity,
          ),
        );
        if (Number.isFinite(delay)) timer = setTimeout(tick, delay);
        return;
      }
      fetching = true;
      const updated = await Promise.all(due.map(({ day }) => fetchDay(day)));
      fetching = false;
      if (controller.signal.aborted) return;
      if (updated.some(Boolean)) setLive(new Map(current));
      if (document.visibilityState === "visible")
        timer = setTimeout(tick, POLL_MS);
    }

    function onVisibility() {
      if (document.visibilityState === "visible") tick();
      else clear();
    }
    document.addEventListener("visibilitychange", onVisibility);
    tick();

    return () => {
      controller.abort();
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

// Update server-rendered rows in place to avoid hydrating the entire table.
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
