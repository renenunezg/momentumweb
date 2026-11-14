# momentumweb

The website behind [renenunez.dev](https://renenunez.dev): one frontend for a set of probabilistic sports forecasting models (MLB, college football, NFL, and NHL).
Each model publishes game forecasts, picks, and a graded record benchmarked against the market, along with ratings and player, prospect, awards, and playoff forecasts.
This repository renders them.

## Stack

- Next.js (App Router, React Server Components), React, TypeScript
- Tailwind CSS with a small set of shadcn primitives on Base UI
- Supabase Postgres, one schema per sport
- Recharts for charts
- Deployed on Vercel

## Architecture

The models live in separate repositories and write their outputs to Supabase.
Supabase is the only interface between this site and those repositories, and the site imports no model code.

```
model repos  ──write──▶  Supabase (one schema per sport)  ──read──▶  this site
```

Each sport owns a Postgres schema (`mlb`, `cfb`, `nfl`, `nhl`) with its own pinned client in `src/lib/supabase.ts`, so a query cannot cross sports by accident.
A schema change on the model side is an API change here; regenerating `src/lib/database.types.ts` surfaces it at compile time.

Routes follow `src/app/<sport>/<page>`, with each sport's methodology page explaining its model.
Sport-scoped API routes under `src/app/<sport>/api/` proxy live score feeds behind a short CDN cache, serve in-game win probabilities, page large player lists on demand, and export the graded records as CSV.

The MLB live-score route is the one place the site writes: after responding, it grades any game the MLB feed shows as final and writes the score and provisional evaluation counts.
The route chooses games to grade from the feed and ignores the request, and the model's nightly reconciliation remains the source of truth.

## Caching

Pages are statically cached (ISR) and refreshed when their data changes.
A statement trigger, `public.site_revalidate()`, sits on every table the site reads and posts to `/api/revalidate`, which expires the cached reads of that table.
Page timers are only a backstop sized to staleness risk, and every page rebuild re-reads the database, so prefer the webhook over a shorter timer.
The site holds no Supabase Realtime subscriptions.

When adding a read:

- A new table the site reads needs the `site_revalidate` trigger attached in its sport's schema.
- A new view needs its base tables listed in `VIEW_TABLES` in `src/lib/cache-tags.ts`.
- A table without the trigger goes in `UNTRIGGERED` there, which gives its reads a short lifetime.

## Rules that must hold

- The pick shown for a started game must be the frozen pick that gets graded, so `src/app/mlb/games/page.tsx` renders per request and is never cached.
- A failed read on a cached page throws (`keepLastGood`), so ISR keeps serving the last good page. During `next build` it fails the deploy, and the previous deploy keeps serving.
- `SUPABASE_SERVICE_ROLE_KEY` is read only by the MLB live-score route, server-side. Everything else uses the anon key.

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
| `REVALIDATE_SECRET` | Authenticates `/api/revalidate`; matches the Supabase Vault secret `site_revalidate_secret` |

Checks:

```bash
npm run lint
npx tsc --noEmit
npm test
```

Tests cover the pure logic that has to agree with the Python backends (grading, accuracy, ROI, drawdown, odds conversions); there are no markup tests on purpose.

## Database types and contracts

When a model repo changes a table, regenerate the types and let the compiler find the call sites:

```bash
npx supabase gen types typescript --project-id <project-ref> --schema mlb,cfb,nfl,nhl > src/lib/database.types.ts
```

`database.types.ts` is generated, so don't edit it by hand.
The explicit-schema `Tables<Schema, Name>` helper lives in `database-schema.ts`.
The versioned payloads in `contracts/` are copied unchanged into the model repositories' tests, and both sides must pass when a contract changes.

## Shared SQL

`sql/` holds the database objects this repository owns: the `site_revalidate` callback function and the site's pg_cron jobs.
Install `sql/001_site_revalidate.sql` before restoring any sport schema, with pg_net and Vault available and `site_revalidate_secret` provisioned separately; each sport repository attaches its own triggers.
`sql/tests/` verifies the callback in disposable PostgreSQL without sending network requests.
