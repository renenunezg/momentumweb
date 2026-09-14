import Link from "next/link";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 space-y-3 pb-10">
      <h2 className="font-heading text-xl tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

const p = "text-sm leading-relaxed text-muted-foreground";
const strongText = "font-medium text-foreground";
const link = "underline underline-offset-2 hover:text-foreground";
const list = "list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground";

export function MethodologyContent() {
  return (
    <div className="min-w-0">
      <Section id="overview" title="Overview">
        <p className={p}>
          The NHL model is a Poisson goal model, ported from a spreadsheet I
          ran by hand for a few seasons. Each team&apos;s recent shot quality
          at home and on the road becomes an expected goals for and against
          per game; those become attack and defense strengths relative to the
          league; a matchup multiplies the two teams&apos; strengths into an
          expected goal count for each side; and a Poisson grid turns the two
          counts into win probabilities and a total. The point of the port is
          to run it every day, freeze every decision before puck drop, and
          grade it in public.
        </p>
        <p className={p}>
          Version one keeps the spreadsheet&apos;s method on purpose, with two
          changes: the shot-quality source and a walk-forward backtest. The
          known weaknesses are listed under Limits. None of it is betting
          advice.
        </p>
      </Section>

      <Section id="data" title="Data">
        <ul className={list}>
          <li>
            <span className={strongText}>Shot quality.</span>{" "}
            <a className={link} href="https://moneypuck.com/data.htm">MoneyPuck</a>&apos;s
            team game-by-game file: shots on goal, goals, and low, medium and
            high danger shots and goals, for and against, with ice time, per
            situation. The spreadsheet read the same rates from Natural Stat
            Trick, which no longer serves automated requests.
          </li>
          <li>
            <span className={strongText}>Schedule, scores, teams.</span> The
            NHL&apos;s public API. Final scores are official, so a shootout
            win counts one goal for the winner, as the books settle it.
          </li>
          <li>
            <span className={strongText}>Prices.</span> The NHL&apos;s partner
            sportsbook feed: DraftKings on the US feed and FanDuel on the
            Canadian feed. Both are read each morning; the better price for a
            side is the one a pick records.
          </li>
        </ul>
      </Section>

      <Section id="windows" title="Windows">
        <p className={p}>
          For every team the model keeps two windows, one of its last 25 home
          games and one of its last 25 road games, each summed by situation:
          even strength (5 on 5), power play (5 on 4), penalty kill (4 on 5),
          and everything else (4 on 4, 3 on 3, 5 on 3, and empty-net play).
          Windows end the day before the run and reach into the previous
          season, so opening night is priced off last spring rather than
          nothing. A window under ten games flags the team; its games are
          still projected but never priced.
        </p>
        <p className={p}>
          From the sums come the spreadsheet&apos;s ten features per
          situation: shots per 60, scoring-chance shooting percentage, high
          danger goals per 60 and shooting percentage, medium danger shots and
          goals per 60 and shooting percentage, low danger shots per 60 and
          shooting percentage, and overall shooting percentage. Goals against
          use the mirror set with save percentages.
        </p>
      </Section>

      <Section id="goal-map" title="Goal Map">
        <p className={p}>
          Goals per 60 minutes is modeled as a linear function of the ten
          features, one fit for goals for and one for goals against, on
          team-seasons from 2021-22 through 2024-25. Expected goals per game at
          a venue is the sum over situations of the fitted rate times that
          situation&apos;s ice time per game. The fit is near an identity on
          observed goals per 60 (the spreadsheet reported an R squared of
          0.999), so in practice the goal map mostly reproduces recent goal
          rates with a little smoothing. Replacing it with expected goals from
          shot location is the first improvement on the list.
        </p>
      </Section>

      <Section id="ratings" title="Ratings">
        <p className={p}>
          Attack strength is a team&apos;s expected goals for divided by the
          league average at that venue; defense strength is expected goals
          against divided by the league average against at that venue. A
          strength of 1.000 is average; a defense below 1.000 allows fewer
          goals than average. The overall rating on the{" "}
          <Link className={link} href="/nhl/ratings">ratings page</Link> is
          home attack plus away attack minus home defense minus away defense.
        </p>
      </Section>

      <Section id="matchup" title="Matchup">
        <p className={p}>
          Expected goals for the home team equal its home attack times the
          visitor&apos;s road defense times the league average home goals;
          the visitor&apos;s expected goals mirror that with road attack, home
          defense and the league average road goals. Home ice enters through
          the venue split rather than a separate constant. Goals for each side
          are then independent Poisson counts on a 0 to 10 grid; the home win
          probability is the mass below the diagonal plus half the tie mass,
          the away side the mirror. That tie split is a rough stand-in for
          overtime and the shootout on a two-way moneyline. The same grid
          gives over, under and push probabilities for a posted total.
        </p>
      </Section>

      <Section id="pricing" title="Pricing">
        <p className={p}>
          The fair price is one over the win probability, shown in American
          odds, with the spreadsheet&apos;s minimum acceptable price beneath
          it: the fair decimal marked up by ten percent. The edge column is the
          model probability minus the implied probability of the better
          partner-book price, vig included, which is exactly the number the
          spreadsheet compared. Fractional Kelly at ten percent of full Kelly
          is published for reference; the ledger itself risks a flat one unit
          per pick so results compare across sports.
        </p>
      </Section>

      <Section id="picks" title="Picks">
        <p className={p}>
          One decision per game and market, recorded every morning for that
          day&apos;s slate and frozen at first publication. A moneyline is
          recommended when the edge over the price&apos;s break-even
          probability is at least 13 percentage points with positive estimated
          EV. A total is recommended when the model total differs from the
          posted line by at least one goal. Prices must be dated within 24
          hours; a stale feed produces No Play, never a guess. A moved,
          postponed or cancelled game voids its pick, totals push on the line,
          and the database rejects any change to a published pick or a settled
          result. The record lives on the{" "}
          <Link className={link} href="/nhl/performance">performance page</Link>.
        </p>
      </Section>

      <Section id="backtest" title="Backtest">
        <p className={p}>
          A walk-forward replay of the 2022-23 through 2025-26 regular seasons
          prices every game from windows that end the day before it, using the
          same goal map. Across 5,212 games the home win probability scores a
          log loss of 0.685 against 0.693 for a coin flip, picks the winner 57
          percent of the time, and the model total misses by 1.90 goals on
          average with a bias of about a sixth of a goal low. The calibration
          bins show the overconfidence a ratio model tends to have: games
          priced at 74 percent for the home side were won 67 percent of the
          time. No free archive of closing lines exists for the NHL, so the
          backtest is model-only; the live record adds the frozen partner
          prices as games accumulate.
        </p>
      </Section>

      <Section id="limits" title="Limits">
        <ul className={list}>
          <li>The Poisson grid stops at ten goals and is not renormalized, as in the spreadsheet.</li>
          <li>Overtime and the shootout are a coin flip on tied regulation scores, not a model.</li>
          <li>Home and away goals are independent; a Dixon-Coles style correction for low scores is not applied.</li>
          <li>The goal map is close to an identity on recent goal rates; expected goals from shot location would carry more signal.</li>
          <li>A hard 25-game window with no shrinkage overreacts to hot and cold stretches, which the calibration shows.</li>
          <li>Goalies are not modeled; a backup start changes nothing.</li>
          <li>The puck line is read but not priced.</li>
          <li>Prices are the morning partner-feed quotes, not closing lines.</li>
        </ul>
      </Section>

      <Section id="stack" title="Tech Stack">
        <p className={p}>
          Python with pandas, numpy and scipy in the{" "}
          <a className={link} href="https://github.com/renenunezg/momentumnhl">momentumnhl</a>{" "}
          repository, run daily by GitHub Actions on a Supabase pg_cron
          dispatch from the day before opening night through April. Outputs
          land in the <code className="font-mono text-xs">nhl</code> Postgres
          schema, where triggers archive every pregame forecast and enforce
          the ledger rules. This site reads that schema and nothing else.
        </p>
      </Section>
    </div>
  );
}
