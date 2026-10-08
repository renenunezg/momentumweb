import type { Metadata } from "next";
import {
  PageShell,
  PageHeader,
  PageTitle,
  PageDescription,
} from "@/components/page-layout";
import { LastUpdated } from "@/components/last-updated";
import DraftWorkspace from "@/components/draft-workspace";
import { fetchDraft, fetchPlayerPage } from "@/lib/draft-server";
import { fetchTeams as fetchNflTeams } from "@/lib/nfl";
export const revalidate = 3600;
export const metadata: Metadata = {
  title: "NFL Draft Board",
  description:
    "Explore an editable NFL mock draft, team priorities, current rosters, and college player performance.",
};
export default async function DraftPage() {
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
