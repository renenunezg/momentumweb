export type Post = {
  slug: string;
  date: string;       // "YYYY-MM-DD"
  title: string;
  summary: string;
  body: string;       // GitHub-flavored markdown, rendered with react-markdown + remark-gfm
};

// Newest first: the home page shows the top two and /blog lists them all.
export const posts: Post[] = [
  {
    slug: "totals-problem",
    date: "2026-05-27",
    title: "The Totals Problem",
    summary: "In an in-sample backtest v2 scored ahead of v1 on moneyline and run line, but totals kept bleeding. I tried three fixes from inside the same modeling frame, none of them moved the number, and that raised a question I probably should have asked earlier.",
    body: `*Editor's note, October 29, 2026: the v1 vs v2 table below scored v2 in sample (its skill model had been fit on data that included these games) against v1's live picks, so it shows how well v2 fit the season. The out-of-sample record, live since May 12, is on the [performance page](/mlb/performance). The numbers are quoted to more decimals than 542 games support.*

When I built v1, I wrapped the whole thing around one output: expected runs per team. The reasoning was that expected runs gives you all three markets at once, which is clean if it works. If team A projects to 6.5 and team B to 3.5, a distribution over those gives you win probabilities for moneyline, the spread of the distributions gives you the runline (a moneyline derivative), and the sum gives you totals. 6.5 + 3.5 = 10, total line is 8, that's two runs of edge, flag the over. That way one number covers all three markets.

v1 ran okay on moneyline, but totals were rough. Variance ran too high, runs were overdispersed, and the totals book was eating us alive while ML kind of held its own. I rebuilt it as v2 on a different premise. v1 predicted an aggregate number and assumed a distribution around it. v2 simulates the actual game pitch by pitch, PA by PA, baserunners and bullpen and the whole flow, and lets the run totals fall out of that. Moneyline got noticeably better under v2. Totals got noticeably worse, which was not what I'd hoped for.

The backtest ran from 2026-03-26 to 2026-05-09, v1 vs v2 on the same games:

| metric | v1 | v2 |
|---|---|---|
| Brier (ML) | 0.2570 | 0.2393 |
| Log-loss (ML) | 0.7244 | 0.6713 |
| Max calibration gap | 41.92% | 3.20% |
| ROI ML (flagged) | +15.82% | +26.25% |
| ROI RL (flagged) | +5.04% | +14.96% |
| ROI Totals (flagged) | -12.83% | -7.58% |

Totals improved on paper but were still bleeding, and once v2 went live they got worse. The other clue was the sim's run-distribution shape at the game level, which I'd been measuring against actual 2025 games with a 200-game variance gate:

| | sim | actual | diff |
|---|---|---|---|
| runs/team-game mean | 4.59 | 4.38 | +4.86% |
| runs/team-game variance | 9.72 | 10.32 | -5.86% |

The mean clears the 5% gate, but the variance is short by about 6%, so the tails are too thin and the distribution is underdispersed at the game level. That underdispersion should hurt totals more than moneyline, because totals lives in the tails (Over by 3, Under by 4) while moneyline only cares which side of zero the run differential lands on.

Before giving up on totals I tried three things to widen or correct the distribution. None of them landed.

First was teaching the simulator about ground-ball matchups. When the sim records an out with runners on, it picks the subtype, double play vs force out vs sac fly vs productive groundout, from a league-average table keyed only on (state, outs), and the batter and pitcher don't enter the equation at all. I stratified the table by batter GB% quartile and pitcher GB% quartile, on the theory that a heavy ground-ball hitter facing a heavy ground-ball pitcher should be seeing more double plays than the league average. Statistically it worked, the direction test passed cleanly, but the variance gap was basically unmoved, 6.0% vs the 5.86% baseline. Out-subtype just turns out to be a weak lever on game-level variance.

Second was bumping the number of posterior draws. v2 samples K=30 random posterior realizations per game and concatenates the resulting run distributions, and I figured more draws would widen the band. The opposite happened, because more draws pull each game toward its posterior mean. Variance got worse, ended up at -6.3%, and I reverted it.

Third was weather, and this is the one I was most excited about going in. Plenty of sharps will tell you wind and temperature are the biggest unpriced inputs in baseball, so I built the whole thing out, pulling per-game temp/wind from the MLB Stats API live feed (the official scorer records it in the boxscore weather block) and fitting coefficients on 363k PAs with park, batter-rate, and pitcher-rate controls. Wind blowing out lifted HR rate, warm air lifted HR and 2B, and the coefficients came out clean and significant (HR-wind +0.0105, p<.001; HR-temp +0.0103, p<.001). I wired it into the simulator and reran the backtest. Moneyline ticked up a hair, totals cratered. On a 16-day window they went from -19% to -41%, which is too small a window to mean much by itself (39 predictions), but on the full window weather's effect on totals was about zero anyway, -19.0% vs -18.2%. The most physically motivated input I had did nothing for totals.

That's three serious attempts from inside the same modeling frame, and none of them moved the number. The thing that finally made the situation clear was the edge-bucket diagnostic, where you grade every candidate prediction by the model's edge and bucket the outcomes. ML and RL come out cleanly edge-monotonic, meaning more model edge correlates with more ROI, the shape you'd want from a working model. Totals don't do that at all. Every bucket loses, and there's no relationship between the model's edge and the actual outcome. A different threshold or selection rule would not fix that. The run distribution is structurally wrong for the totals market.

The question I probably should have asked earlier is whether modeling totals as a mathematical distribution over expected runs is the wrong frame for that market. Maybe totals needs its own model, separate from the engine that prices the other two. Or maybe baseball's run distribution is too clustered and sequence-dependent for any aggregate-runs approach to find a real edge on a totals book in the first place. A 2.4-run MAE on game totals is a fine baseball number in the abstract, but it's useless for a market set at 8.5 where the line moves on half a run and you're off by five times that.

I don't have an answer yet. Totals are off for now, \`TOTALS_ENABLED = False\`, one boolean in \`backend/strategy.py\`, and they stay off until a fix holds up on more than a 39-prediction window.`,
  },
  {
    slug: "v2-coming",
    date: "2026-05-03",
    title: "A Month of XGBoost and Why V2 Goes Bayesian",
    summary: "One month of live predictions with a 14-feature XGBoost regressor, and why v2 moves to a hierarchical Bayesian model.",
    body: `*Editor's note, October 29, 2026: v2 went live on May 12, 2026. The comparison that justified the switch was scored in sample for v2; its out-of-sample record, including calibration, is on the [performance page](/mlb/performance).*

When I started this project, I was operating on a personal hypothesis I'd had for a couple of years while modeling sports: since baseball has the highest variance of any major sport, introducing overly complex modeling techniques would likely lead to overfitting and, ultimately, worse performance.

I chose expected runs as the main output metric for two reasons: A) expected runs translate naturally via distributions like Poisson or negative binomial into win probabilities, making the model easier to evaluate, and B) they can also directly inform totals (over/under) predictions.

After seeing some success using tree-based models, specifically XGBoost, to predict xR-type outputs in other sports (mainly hockey), I decided to apply the same approach to baseball (my favorite sport), handpicking the features I considered most informative.

Even though I was aiming for a relatively simple approach, there were still two problems to solve: deriving win probabilities correctly, and calibration, since XGBoost is notoriously uncalibrated out of the box.

For win probabilities I used a negative binomial distribution. Poisson assumes that variance equals mean, while real baseball scoring environments are heavily overdispersed and tend to cluster.

As for calibration, I was looking to achieve reasonable alignment between the model's confidence and actual win percentages. In other words, if the home team has a 60% win probability, then it should win roughly 60% of the time.

After a bit of research this brought me to isotonic regression, since it maps predicted probabilities to real observed frequencies and is non-parametric (we don't have to commit to a functional form).

![Calibration curve](/blog/calibration.png)

I later regretted this decision somewhat, since isotonic regression can overfit aggressively on smaller samples.

After testing on the first month of the season and evaluating against sharp sportsbook markets, the initial prediction results looked encouraging:

![Accuracy over time](/blog/accuracy_over_time.png)

ROI was positive across several segments, particularly underdogs and run lines:

| Category | ROI | Record |
|----------|-----|--------|
| Favorites | +4.2% | 29-23 |
| Underdogs | +22.0% | 63-59 |
| Run Line | +10.0% | 110-67 |
| Overs | -1.6% | 43-47 |
| Unders | -23.2% | 28-41 |

**Average line on underdog predictions: +111**

![ROI by segment](/blog/roi_by_segment.png)

However, prediction results over a one-month sample are extremely noisy and easy to misinterpret. Positive ROI alone does not show that the underlying probability estimates are strong.

The probability metrics mattered more.

![Brier score over time](/blog/brier_over_time.png)

![MAE over time](/blog/mae_over_time.png)

Despite some positive prediction results, the model's probability predictions were only marginally better than random.

Brier score, which measures calibration quality, suggested that the model outputs were only negligibly better than coin-flip probabilities. Meanwhile, MAE settled around 2.4 runs of average error, which is a respectable baseline for baseball scoring prediction.

The bigger issue was that the whole setup is locked to a point estimate, so even when the model predicts the right side of a line, it has nothing to say about how the run distribution is shaped. That matters most on totals, where the line is asking a distributional question and a single number can't answer it.

That realization pushed me toward a simulation-based Bayesian framework for v2.

## The Beauty of Bayes

Back when I was an undergrad with a growing interest in probability and statistics, looking for alternatives to the limitations of frequentist modeling, I was drawn to the way Bayesian methods formalize how a rational mind should update its beliefs as new data comes in. I also liked that Bayes' theorem corrects itself and handles thin early data gracefully. Hence, hierarchical Bayesian.

Bayesian modeling in one paragraph:

Instead of finding a single best parameter value, we treat parameters as random variables and estimate their posterior distribution given the observed data. We start with a prior (what we believe before seeing data), combine it with the likelihood (how well different parameter values explain the observed outcomes), and arrive at a posterior (what we believe after observing the data). The posterior gives us a point estimate and an explicit measure of uncertainty.

"Hierarchical" means parameters are nested. Each individual batter has their own skill profile, but those skills are drawn from a shared population distribution. This gives us partial pooling: a rookie with 50 plate appearances gets shrunk heavily toward the league average because we do not yet trust the sample, while a veteran with 5,000 plate appearances barely shrinks at all because the observed data dominates the prior. XGBoost has no equivalent mechanism. It treats each observation independently.

Concretely, v2 models each plate appearance as a probabilistic interaction between batter skill, pitcher skill, platoon effects, and park context.

The model itself is a hierarchical multinomial-logit over eight outcome cells per plate appearance: strikeout, walk, hit-by-pitch, single, double, triple, home run, and out-in-play. (An earlier version of this post called it a Dirichlet-Multinomial, which was wrong. The actor effects are Normal on the logit scale, which makes the outcome probabilities logistic-normal, and no Dirichlet prior is involved.)

For each batter, we estimate a seven-dimensional vector of additive logit offsets (with "out" as the reference category). Pitchers receive the same treatment, with separate variance structures for starters and relievers. The model also includes platoon split adjustments and park-level residual effects on wOBA.

When a specific batter faces a specific pitcher, the outcome probabilities are generated by softmaxing the sum of:

- League-average logits (the intercept)
- Batter logit offsets for the relevant platoon split
- Pitcher logit offsets
- Park effects

## The Simulator: Per-Plate-Appearance Monte Carlo

Once we have posterior estimates for batter skill, pitcher skill, and park effects, the simulator plays out each game one plate appearance at a time, running 10,000+ simulations per matchup.

The output is a full joint distribution over (home_runs, away_runs), from which moneyline, run line, and totals probabilities can be derived directly.

This removes the manually imposed negative binomial assumption and the unrealistic independence between teams. Scoring correlation comes out of the interaction between lineups, pitchers, bullpen usage, and game context.

## Why This Is Better Than V1

A few concrete things v2 can do that v1 could not:

- v1 relied on team-level batting splits, so a team with its full starting lineup got nearly the same prediction as a banged-up or resting lineup. v2 puts the actual posted lineup into the simulation.

- v1 produced point estimates and assumed run distributions afterward. v2 generates the scoring distribution itself through simulation.

- The posterior distributions provide credible intervals for each modeled quantity.

- Weather effects, umpire tendencies, or batter-pitcher interaction terms go into the generative model directly, with no new feature-engineered pipeline.

- Baseball games are sequential, interaction-heavy processes, and modeling them one plate appearance at a time is closer to how runs get scored.`,
  },
];
