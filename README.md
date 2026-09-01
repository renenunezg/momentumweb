# momentumweb

The website behind [renenunez.dev](https://renenunez.dev): one frontend for a set of sports prediction models. MLB picks are published daily and graded live, college football and NFL publish weekly power ratings and spread projections, and every model is measured against the closing line in public.

The models themselves live in separate repositories and write their outputs to Postgres. This repository only reads those tables and renders them.

## Stack

- Next.js 16 (App Router, React Server Components), React 19, TypeScript
- Tailwind CSS v4 with a small set of shadcn primitives on Base UI
- Supabase Postgres, one schema per sport, plus Supabase Realtime for refresh-on-write
- Recharts for the performance charts
- Deployed on Vercel

## Architecture

Supabase is the only interface between this site and the model repositories. Each sport owns a Postgres schema (`mlb`, `cfb`, `nfl`), and each has a pinned client in `src/lib/supabase.ts` so a query cannot cross sports by accident. The site never imports model code and never calls a model repo; a schema change on the model side is an API change here, and `src/lib/database.types.ts` surfaces it at compile time.

```
model repos  ──write──▶  Supabase (mlb / cfb / nfl schemas)  ──read──▶  this site
```

Route tree:

| Route | What it renders |
| --- | --- |
| `/` | Home hub with a live headline per sport and the latest posts |
| `/mlb/games` | Today's slate with picks, Kelly stakes, and live scores (rendered per request) |
| `/mlb/history` | Season-long pick history from the unified v1+v2 view |
| `/mlb/performance` | Accuracy, calibration, betting KPIs, and posterior diagnostics |
| `/cfb/ratings`, `/nfl/ratings` | Power ratings by tier, conference or division, and unit |
| `/cfb/schedule`, `/nfl/schedule` | Weekly projections priced against the market |
| `/cfb/history`, `/nfl/history` | Graded games, live season first, frozen backtest behind it |
| `/cfb/performance`, `/nfl/performance` | Model vs closing line, by season and by segment |
| `/*/methodology` | How each model works |
| `/blog`, `/about` | Writing and contact |

Two API routes support the MLB games page. `GET /mlb/api/live-scores` is a cached proxy to the MLB Stats API so many browsers polling the page cost at most two upstream requests a minute. `POST /mlb/api/eval-game` writes a final score back and refreshes the day's evaluation windows when a game finishes; it is idempotent, takes nothing from the request but a game id, and every value it writes comes from the MLB API.

Things that are load-bearing and easy to break:

- `src/app/mlb/games/page.tsx` is `force-dynamic`. The pick shown for a started game must be the frozen pick that gets graded, so it cannot be served from a cached render.
- `SUPABASE_SERVICE_ROLE_KEY` is read only inside `src/app/mlb/api/eval-game/route.ts`. Everything else uses the anon key.
- Every page fetch degrades to an empty state on a Supabase error. A model repo outage should never 500 the site.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev
```

| Variable | Used by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | all Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | read-only clients (server and browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eval-game` route only, never shipped to the browser |

Checks:

```bash
npm run lint
npx tsc --noEmit
npm test
```

Tests cover the pure logic that has to agree with the Python backend: pick grading, per-game accuracy, Kelly-weighted ROI, drawdown, and the odds conversions. There are no markup tests on purpose.

## Regenerating database types

When a model repo changes a table, regenerate the types and let the compiler find the call sites:

```bash
npx supabase gen types typescript --project-id <project-ref> --schema mlb,cfb,nfl > src/lib/database.types.ts
```
