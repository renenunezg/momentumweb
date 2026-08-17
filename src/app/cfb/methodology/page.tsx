import { TableOfContents } from "./toc";
import { MethodologyContent } from "./methodology-content";

export const revalidate = 1800;

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl tracking-tight">Methodology</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Possession-based ratings, calibrated game distributions, and a
          market-anchored in-game win probability model
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[180px_1fr] lg:gap-8">
        <TableOfContents />
        <MethodologyContent />
      </div>
    </main>
  );
}
