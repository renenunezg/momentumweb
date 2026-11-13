-- Requires pg_cron. Each weekly NFL awards board stores every candidate with
-- JSON stats, projections, and forecast factors (~6 MB a week). The site shows
-- that detail for the top 25 by forecast or performance; the rest of a past
-- board is needed only for search and the leader trend chart, which read name,
-- team, position, and ranks. So once a newer board exists for an award, rows
-- outside both top 25s lose their JSON. Ranks, scores, and the candidate count
-- the site checks stay intact. The guard skips the update, and with it the
-- site_revalidate statement trigger, when nothing is left to slim.
SELECT cron.schedule(
  'nfl-award-board-retention',
  '20 11 * * *',
  $$
  do $job$
  begin
    if exists (
      select 1 from nfl.award_boards b
      where b.predicted_rank > 25 and coalesce(b.performance_rank, 26) > 25
        and (b.projected_stats <> '{}' or b.season_stats <> '{}' or b.drivers <> '[]')
        and exists (select 1 from nfl.award_boards l
                    where l.award = b.award and (l.season, l.week) > (b.season, b.week))
    ) then
      update nfl.award_boards b
      set projected_stats = '{}', season_stats = '{}', drivers = '[]'
      where b.predicted_rank > 25 and coalesce(b.performance_rank, 26) > 25
        and (b.projected_stats <> '{}' or b.season_stats <> '{}' or b.drivers <> '[]')
        and exists (select 1 from nfl.award_boards l
                    where l.award = b.award and (l.season, l.week) > (b.season, b.week));
    end if;
  end
  $job$
  $$
);
