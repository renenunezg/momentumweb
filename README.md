# momentumweb

The website behind [renenunez.dev](https://renenunez.dev): one frontend for a set of probabilistic sports forecasting models.
MLB run-distribution forecasts are published daily and graded live, college football and NFL publish weekly power ratings and spread projections, the NHL model prices every slate against the league's partner sportsbooks, and every model is benchmarked against the market in public.

The models themselves live in separate repositories and write their outputs to Postgres.
This repository renders those tables.
The MLB live-score route also writes official final scores and provisional evaluation counts; the MLB model owns nightly reconciliation.

## Stack

- Next.js 16 (App Router, React Server Components), React 19, TypeScript
- Tailwind CSS v4 with a small set of shadcn primitives on Base UI
- Supabase Postgres, one schema per sport, with authenticated cache invalidation and timed live-score polling
- Recharts for the performance charts
- Deployed on Vercel

## Architecture

Supabase is the only interface between this site and the model repositories.
Each sport owns a Postgres schema (`mlb`, `cfb`, `nfl`, `nhl`), and each has a pinned client in `src/lib/supabase.ts` so a query cannot cross sports by accident.
The site never imports model code and never calls a model repo; a schema change on the model side is an API change here, and `src/lib/database.types.ts` surfaces it at compile time.

```
model repos  ──write──▶  Supabase (mlb / cfb / nfl / nhl schemas)  ──read──▶  this site
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
| `/nhl/games` | Today's NHL slate with fair and partner-book prices, picks, and live scores (rendered per request) |
| `/nhl/ratings`, `/nhl/schedule` | Venue-split expected goals and strengths; the next seven days of projections |
| `/nhl/history`, `/nhl/performance` | Frozen NHL picks graded at the recorded price; win-probability calibration on the live season and the backtest |
| `/*/methodology` | How each model works |
| `/blog`, `/about` | Writing and contact |

One API route supports the MLB games page.
`GET /mlb/api/live-scores` is a CDN-cached proxy to the MLB Stats API so many browsers polling the page cost at most two upstream requests a minute per region.
It is also the live-grading trigger: after responding, it grades any game the schedule shows as Final, writing the score back and refreshing the day's evaluation windows.
Which game gets graded is decided server-side from the MLB feed, never from the request, so the site exposes no write endpoint; the CDN window bounds grading to one pass per window, and the nightly Python batch remains the source of truth.

Things that are load-bearing and easy to break:

- `src/app/mlb/games/page.tsx` is `force-dynamic`.
The pick shown for a started game must be the frozen pick that gets graded, so it cannot be served from a cached render.
- `SUPABASE_SERVICE_ROLE_KEY` is read only inside `src/app/mlb/api/live-scores/route.ts`, for the grading step.
Everything else uses the anon key.
- Failed reads must render an unavailable state, distinct from unpublished decisions or a genuine empty result.
Healthy independent sections remain visible.

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
| `SUPABASE_SERVICE_ROLE_KEY` | Optional local live grading, server-side only; leave unset for read-only development |
| `REVALIDATE_SECRET` | Authenticates `/api/revalidate`; matches the Supabase Vault secret named `site_revalidate_secret` |

Checks:

```bash
npm run lint
npx tsc --noEmit
npm test
```

Tests cover the pure logic that has to agree with the Python backend: pick grading, per-game accuracy, Kelly-weighted ROI, drawdown, and the odds conversions.
There are no markup tests on purpose.

## Regenerating database types

When a model repo changes a table, regenerate the types and let the compiler find the call sites:

```bash
npx supabase gen types typescript --project-id <project-ref> --schema mlb,cfb,nfl,nhl > src/lib/database.types.ts
```

Public football reads and cached pages expire after one hour and refresh on authenticated database callbacks.
Live-score and live-probability routes use short CDN windows.
The site uses no Supabase Realtime subscriptions.

The shared cache callback is owned here in `sql/001_site_revalidate.sql`.
Install it before restoring sport schemas, with pg_net and Vault available and `site_revalidate_secret` provisioned separately.
Each sport owns its table trigger attachments.
MLB live evaluation requires the model repository's `live_evaluation_reconciliation.sql` migration and is explicitly provisional until nightly reconciliation.
The migration prevents stale concurrent live writes from replacing newer or canonical results.

`database.types.ts` is generated without hand edits; the explicit-schema `Tables<Schema, Name>` helper lives separately in `database-schema.ts`.

The versioned acceptance payloads in `contracts/v1/` are copied unchanged into the corresponding model repository tests.
Their producer and consumer tests must both pass when a database contract changes.
`sql/tests/revalidation.sql` verifies the shared callback in disposable PostgreSQL without sending network requests.
