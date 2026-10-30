import type { Metadata } from "next";
import {
  PageShell,
  PageHeader,
  PageTitle,
  PageDescription,
} from "@/components/page-layout";
import { PlayerSectionTabs } from "@/components/player-section-tabs";
import { LastUpdated } from "@/components/last-updated";
import DraftWorkspace from "@/components/draft-workspace";
import { Notice } from "@/components/notice";
import { buildSafe } from "@/lib/build-safe";
import { fetchDraft, fetchPlayerPage } from "@/lib/draft-server";
import { fetchTeams as fetchNflTeams } from "@/lib/nfl";
export const revalidate = 3600;
export const metadata: Metadata = {
  title: "NFL Draft Board",
  description:
    "Explore an editable NFL mock draft, team priorities, current rosters, and college player performance.",
};
export default async function DraftPage() {
  // An unavailable publication throws so ISR keeps the last good page, except
  // during the build (see buildSafe).
  const read = await buildSafe("NFL draft", async () => {
    const [data, nflTeams] = await Promise.all([
      fetchDraft("workspace"),
      fetchNflTeams(),
    ]);
    const [initialPlayers, initialRoster] = data
      ? await Promise.all([
          fetchPlayerPage(data.board.season),
          fetchDraft("roster", data.board.season).then((rows) =>
            rows.filter((row) => row.team === data.board.picks[0].owner),
          ),
        ])
      : [null, []];
    return { data, nflTeams, initialPlayers, initialRoster };
  });
  if (!read) {
    return (
      <PageShell width="wide">
        <PageTitle>NFL Draft</PageTitle>
        <Notice role="status">The draft board is temporarily unavailable.</Notice>
      </PageShell>
    );
  }
  const { data, nflTeams, initialPlayers, initialRoster } = read;
  return (
    <PageShell width="wide">
      <PageHeader>
        <div>
          <PageTitle>{data?.board.season} NFL Draft</PageTitle>
          <PageDescription>
            Seven-round mock draft, scouting rankings, and team needs.
          </PageDescription>
        </div>
        {data && (
          <LastUpdated
            timestamp={data.meta.published_at}
            schedule="Refreshes after the weekly college update"
          />
        )}
      </PageHeader>
      <PlayerSectionTabs />
      {data ? (
        <DraftWorkspace
          data={data}
          initialPlayers={initialPlayers!}
          initialRoster={initialRoster}
          nflLogos={Object.fromEntries(
            [...nflTeams].map(([abbr, t]) => [
              abbr,
              { logo_light: t.logo_light, logo_dark: t.logo_dark },
            ]),
          )}
        />
      ) : (
        <p>The draft board has not been published yet.</p>
      )}
    </PageShell>
  );
}
