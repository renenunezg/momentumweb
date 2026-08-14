import type { CfbTeamIdentity } from "@/lib/types";
import { cn } from "@/lib/utils";

// One image per logo, never two, and the right one for the theme.
//
// CFBD ships a light and a dark variant. Rendering both as <img> and hiding
// one with CSS doubles the bytes, because a display:none <img> is still
// fetched: a 172-game slate would pull ~690 logos instead of ~345. Picking the
// variant in React instead would mean reading the theme on the client, which
// the server-rendered schedule table cannot do without a flash.
//
// A CSS background-image sidesteps both. Only the declaration that wins the
// cascade is ever fetched, so each logo costs exactly one request, and the
// swap keys off the .dark class, which is what the theme toggle actually sets
// (prefers-color-scheme would ignore a manual override).
export function TeamLogo({
  team,
  className,
}: {
  team: CfbTeamIdentity | undefined;
  className?: string;
}) {
  const box = cn("inline-block h-5 w-5 shrink-0 align-middle", className);
  const light = team?.logo_light ?? team?.logo_dark;
  const dark = team?.logo_dark ?? team?.logo_light;

  // Two D1 teams (Chicago State, West Florida) have no logo on file; an empty
  // box keeps every team name on the same left edge.
  if (!light || !dark) return <span className={box} aria-hidden="true" />;

  return (
    <span
      aria-hidden="true"
      style={
        {
          "--logo-light": `url("${light}")`,
          "--logo-dark": `url("${dark}")`,
        } as React.CSSProperties
      }
      className={cn(
        box,
        "bg-[image:var(--logo-light)] bg-contain bg-center bg-no-repeat",
        "dark:bg-[image:var(--logo-dark)]"
      )}
    />
  );
}
