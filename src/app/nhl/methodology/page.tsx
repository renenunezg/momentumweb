import type { Metadata } from "next";
import { TableOfContents } from "./toc";
import { MethodologyContent } from "./methodology-content";

export const metadata: Metadata = {
  title: "NHL Model Methodology",
  description:
    "How the NHL model works: last-25-game shot-quality windows by venue and situation, a linear goal map, attack and defense strengths, a Poisson goal grid, and partner-book pricing with frozen picks.",
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl">NHL Model Methodology</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Shot-quality windows, a Poisson goal grid, and frozen partner-book
          picks: the spreadsheet model, run daily
        </p>
      </div>
      <div className="lg:grid lg:grid-cols-[180px_1fr] lg:gap-8">
        <TableOfContents />
        <MethodologyContent />
      </div>
    </main>
  );
}
