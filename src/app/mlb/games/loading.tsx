import { PageHeader, PageShell, PageTitle } from "@/components/page-layout";

export default function GamesLoading() {
  return (
    <PageShell aria-busy="true">
      <PageHeader>
        <PageTitle>Today&apos;s MLB Predictions</PageTitle>
      </PageHeader>
      <p role="status" className="text-sm text-muted-foreground">
        Loading today&apos;s predictions and scores…
      </p>
      <div aria-hidden="true" className="space-y-content motion-safe:animate-pulse">
        <div className="h-8 border-y border-rule-strong bg-muted/40" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-24 border-b border-border bg-muted/20" />
        ))}
      </div>
    </PageShell>
  );
}
