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
      <h2 className="font-heading text-xl">{title}</h2>
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
          at home and on the road becomes attack and defense strengths
          relative to the league; a matchup multiplies them into expected
          goals for each side; and a Poisson grid turns those into win
          probabilities and a total. The port exists to run it every day,
          freeze every decision before puck drop, and grade it in public.
        </p>
        <p className={p}>
          Version one keeps the spreadsheet&apos;s method on purpose, with two
          changes: the shot-quality source and a walk-forward backtest. None
          of it is betting advice.
        </p>
      </Section>

      <Section id="data" title="Data">
        <ul className={list}>
          <li>
            <span className={strongText}>Shot quality.</span>{" "}
            <a className={link} href="https://moneypuck.com/data.htm">MoneyPuck</a>&apos;s
            team game-by-game file: shots, goals and ice time by danger level
            and situation, for and against. The spreadsheet used Natural Stat
            Trick, which no longer serves automated requests.
          </li>
          <li>
            <span className={strongText}>Schedule, scores, teams.</span> The
            NHL&apos;s public API. A shootout win counts one goal for the
            winner, as the books settle it.
          </li>
          <li>
            <span className={strongText}>Prices.</span> The NHL&apos;s partner
            sportsbook feed, read each morning: DraftKings on the US feed and
            FanDuel on the Canadian feed. A pick records the better of the
            two.
          </li>
        </ul>
      </Section>

      <Section id="windows" title="Windows">
        <p className={p}>
          Every team has two windows, its last 25 home games and its last 25
          road games, each summed by situation: even strength, power play,
          penalty kill, and everything else (4 on 4, 3 on 3, 5 on 3, empty
          net). Windows end the day before the run and reach into the previous
          season, so opening night is priced off last spring. A team with
          under ten games in a window is projected but never priced.
        </p>
        <p className={p}>
          Each situation yields the spreadsheet&apos;s ten features: shot and
          goal rates per 60 and shooting percentages, overall and by high,
          medium and low danger. Goals against use the mirror set with save
          percentages.
        </p>
      </Section>

      <Section id="goal-map" title="Goal Map">
        <p className={p}>
          Goals per 60 minutes is a linear function of the ten features, one
          fit for goals for and one for goals against, on even-strength
          team-seasons from 2021-22 through 2024-25 and applied to every
          situation. Expected goals per game at a venue sums each
          situation&apos;s fitted rate times its ice time per game. The fit is
          near an identity on observed goals per 60 (R squared 0.999), so it
          mostly reproduces recent goal rates.
        </p>
      </Section>

      <Section id="matchup" title="Ratings and Matchup">
        <p className={p}>
          Attack strength is a team&apos;s expected goals for divided by the
          league average at that venue; defense strength is the same for goals
          against, so 1.000 is average and a lower defense is better. The
          overall rating on the{" "}
          <Link className={link} href="/nhl/ratings">ratings page</Link> is
          home attack plus away attack minus home defense minus away defense.
        </p>
        <p className={p}>
          The home team&apos;s expected goals equal its home attack times the
          visitor&apos;s road defense times the league average home goals; the
          visitor&apos;s mirror that. Home ice enters through the venue split
          rather than a constant. Each side&apos;s goals are independent
          Poisson counts on a 0 to 10 grid: a win probability is the mass on
          that side of the diagonal plus half the tie mass, and the same grid
          gives over, under and push probabilities for a posted total.
        </p>
      </Section>

      <Section id="picks" title="Pricing and Picks">
        <p className={p}>
          The fair price is one over the win probability, shown in American
          odds with the spreadsheet&apos;s minimum acceptable price beneath
          it: the fair decimal marked up by ten percent. The edge is the model
          probability minus the break-even probability of the partner-book
          price, vig included. Every pick risks a flat one unit so results
          compare across sports; Kelly at ten percent of full is published for
          reference.
        </p>
        <p className={p}>
          One decision per game and market, recorded each morning for that
          day&apos;s slate and frozen at first publication. A moneyline is
          recommended at an edge of at least 13 percentage points with
          positive expected value; a total when the model total differs from
          the posted line by at least one goal. Prices older than 24 hours
          produce No Play. A moved, postponed or cancelled game voids its
          pick, totals push on the line, and the database rejects any change
          to a published pick or a settled result. The record lives on the{" "}
          <Link className={link} href="/nhl/performance">performance page</Link>.
        </p>
      </Section>

      <Section id="backtest" title="Backtest">
        <p className={p}>
          A walk-forward replay of the 2022-23 through 2025-26 regular seasons
          prices every game from windows that end the day before it. Across
          5,212 games the home win probability scores a log loss of 0.685
          against 0.693 for a coin flip and picks the winner 57 percent of the
          time; the model total misses by 1.90 goals on average and runs
          about a sixth of a goal low. It is overconfident: games priced at 74
          percent for the home side were won 67 percent of the time. No free
          archive of NHL closing lines exists, so the backtest is model-only;
          the live record adds frozen partner prices as games accumulate.
        </p>
      </Section>

      <Section id="limits" title="Limits">
        <ul className={list}>
          <li>The Poisson grid stops at ten goals and is not renormalized.</li>
          <li>Overtime and the shootout are a coin flip on tied regulation scores, not a model.</li>
          <li>Home and away goals are independent, with no Dixon-Coles style correction for low scores.</li>
          <li>Expected goals from shot location would carry more signal than the goal map; that is the first planned improvement.</li>
          <li>A hard 25-game window with no shrinkage overreacts to hot and cold stretches.</li>
          <li>Goalies are not modeled; a backup start changes nothing.</li>
          <li>The puck line is read but not priced.</li>
          <li>Prices are the morning partner-feed quotes, not closing lines.</li>
        </ul>
      </Section>

      <Section id="stack" title="Tech Stack">
        <p className={p}>
          Python with pandas, numpy and scipy in the{" "}
          <a className={link} href="https://github.com/renenunezg/momentumnhl">momentumnhl</a>{" "}
          repository, run each morning by GitHub Actions from the day before
          opening night through April. Outputs land in the{" "}
          <code className="font-mono text-xs">nhl</code> Postgres schema,
          where triggers archive every pregame forecast and enforce the ledger
          rules; this site reads only that schema.
        </p>
      </Section>
    </div>
  );
}
