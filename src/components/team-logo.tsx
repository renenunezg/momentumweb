import { cn } from "@/lib/utils";

// Structural, so both CfbTeamIdentity (logos stored per team by CFBD) and
// MlbTeamIdentity (logo URLs derived from the team id) satisfy it without the
// component knowing which sport it is rendering.
interface TeamLogoSource {
  logo_light: string | null;
  logo_dark: string | null;
}

// A CSS background rather than an <img>, so each logo costs one request and
// still follows the theme. A display:none <img> is still fetched, so rendering
// both CFBD variants would pull ~690 logos for a 172 game slate instead of
// ~345; picking in React would need the theme on the client, which the
// server-rendered schedule cannot have without a flash. Only the declaration
// winning the cascade is fetched, and .dark is what the toggle sets
// (prefers-color-scheme would ignore a manual pick).
export function TeamLogo({
  team,
  name,
  className,
}: {
  team: TeamLogoSource | undefined;
  name: string;
  className?: string;
}) {
  const box = cn("inline-block h-5 w-5 shrink-0 align-middle", className);
  const light = team?.logo_light ?? team?.logo_dark;
  const dark = team?.logo_dark ?? team?.logo_light;

  // Chicago State and West Florida have no logo on file; a monogram keeps the
  // row aligned and still identifies the team.
  if (!light || !dark) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          box,
          "flex items-center justify-center rounded-[4px] bg-muted text-[9px] font-semibold text-muted-foreground"
        )}
      >
        {monogram(name)}
      </span>
    );
  }

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

// Initials of the first two words, so "West Florida" reads WF and a
// single-word name falls back to its first two letters.
function monogram(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
