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
          The spreadsheet&apos;s method is kept on purpose, with three
          changes: the shot-quality source, a walk-forward backtest, and,
          since October 9, 2026, a forecast blended halfway with the betting
          market for every game the books have priced. None of it is betting
          advice.
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
          <li>
            <span className={strongText}>Historical lines.</span> Opening and
            closing moneylines and totals for the backtest seasons, from
            ESPN&apos;s public odds data. They are used to check the model
            against the market, never to price a pick.
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

      <Section id="market" title="Market Blend">
        <p className={p}>
          On its own the model does not beat the betting market. Checked
          against opening and closing lines for the backtest seasons, the
          market&apos;s price predicts winners and totals better than the
          model does, and once the price is known the model adds nothing to
          it. So for every game the books have priced, the published forecast
          is blended halfway with the market.
        </p>
        <p className={p}>
          The market&apos;s win probability is the no-vig probability from
          each book that quotes both sides (the two implied probabilities
          scaled to sum to one), averaged over DraftKings and FanDuel. The
          model&apos;s home win probability first gets a small home-ice
          correction of 0.10 in log-odds, because it runs about two points low
          on home teams, and is then averaged with the market in log-odds. The
          model total is averaged with the posted total, using the median line
          when the books disagree.
        </p>
        <p className={p}>
          Each side&apos;s expected goals are then reset so the Poisson grid
          returns exactly that win probability and that total. Everything
          shown for the game, the expected goals, win probability, fair price,
          total, any pick, and the opening point of the live win probability,
          comes from that one blended forecast.
        </p>
        <p className={p}>
          The partner feed only prices the current day&apos;s games, so games
          further out on the{" "}
          <Link className={link} href="/nhl/schedule">schedule</Link> show the
          model alone until the morning they are played. The halfway weight is
          a choice, not a fitted value: the data would put nearly all of the
          weight on the market, and the model would then never disagree with
          a price.
        </p>
      </Section>

      <Section id="picks" title="Pricing and Picks">
        <p className={p}>
          The fair price is one over the published win probability, shown in
          American odds with the spreadsheet&apos;s minimum acceptable price
          beneath it: the fair decimal marked up by ten percent. The edge is
          the published probability minus the break-even probability of the
          partner-book price, vig included. Every pick risks a flat one unit
          so results compare across sports; Kelly at ten percent of full is
          published for reference.
        </p>
        <p className={p}>
          One decision per game and market, recorded each morning for that
          day&apos;s slate and frozen at first publication. A moneyline is
          recommended at an edge of at least 4.5 percentage points with
          positive expected value; a total when the published total differs
          from the posted line by at least half a goal, which is the
          spreadsheet&apos;s one-goal rule applied to the model&apos;s own
          total. A game without a two-sided price, or with prices older than
          24 hours, produces No Play. A moved, postponed or cancelled game
          voids its pick, totals push on the line, and the database rejects
          any change to a published pick or a settled result. The record
          lives on the{" "}
          <Link className={link} href="/nhl/performance">performance page</Link>.
        </p>
        <p className={p}>
          Picks through October 9, 2026 followed the spreadsheet&apos;s
          original rules: the model alone, 13 percentage points for a
          moneyline, and one goal for a total. The performance page separates
          the two policies.
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
          percent for the home side were won 67 percent of the time.
        </p>
        <p className={p}>
          Against historical lines the market is better. Over the 3,900
          games from 2023-24 through 2025-26 the closing moneyline scores a
          log loss of 0.665, the model alone 0.691, and the halfway blend
          0.671. The posted total misses by 1.87 goals on average against 1.92
          for the model. Betting the model against those lines lost money at
          every threshold tried: the spreadsheet&apos;s 13-point moneyline
          rule lost between 8 and 15 percent per unit depending on the season
          and whether the opening or closing price was used. The backtest
          gives no reason to expect the picks to profit.
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
          <li>The blend weight and the pick thresholds are choices, not fitted values, and the backtest finds no betting edge at any threshold.</li>
          <li>Games beyond the current day have no market price yet, so their forecast changes when the blend is applied on game day.</li>
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
