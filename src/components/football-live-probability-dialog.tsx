"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { FootballLeague } from "@/lib/football-slates";

const FootballLiveProbabilityContent = dynamic(() => import("@/components/football-live-probability-content"), {
  loading: () => <p role="status" className="mt-5 text-sm text-muted-foreground">Loading win probability...</p>,
});

export function FootballLiveProbabilityDialog({ league, gameId, away, home }: {
  league: FootballLeague; gameId: string; away: string; home: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger aria-label={`Win probability for ${away} at ${home}`}
        className="inline-flex items-center gap-1.5 rounded-sm px-1 py-1 text-xs font-normal text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        <ChartNoAxesCombined className="size-3.5" aria-hidden="true" />Win probability
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-sm">
        <DialogTitle className="pr-8 text-xl font-normal">{away} @ {home}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-muted-foreground">
          Win probability through the game
        </DialogDescription>
        {open && <FootballLiveProbabilityContent key={gameId} league={league} gameId={gameId} away={away} home={home} />}
      </DialogContent>
    </Dialog>
  );
}
