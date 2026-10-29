import { IntentLink as Link } from "@/components/navigation-link";
import { SignedBar } from "@/components/signed-bar";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ComparisonRow, Verdict } from "@/lib/home-research.server";

const VERDICTS: Record<Verdict, string> = {
  model: "Model better",
  noise: "Within noise",
  benchmark: "Benchmark better",
};

// Without an interval only the sign is known, so the verdict says less.
const SIGN_ONLY: Record<Verdict, string> = {
  model: "Model ahead",
  noise: "Even",
  benchmark: "Benchmark ahead",
};

// Each published model beside the benchmark it is measured against. Rows mix
// measures, so every row names its own and the bar's extent is set per row.
export function HomeComparisons({ rows }: { rows: ComparisonRow[] }) {
  return (
    <Table className="type-label">
      <TableCaption className="sr-only">Each model compared with its benchmark</TableCaption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-0">Model</TableHead>
          <TableHead className="hidden md:table-cell">Compared with</TableHead>
          <TableHead className="hidden text-right md:table-cell">Model</TableHead>
          <TableHead className="hidden text-right md:table-cell">Benchmark</TableHead>
          <TableHead>Difference</TableHead>
          <TableHead className="hidden pr-0 lg:table-cell">Sample</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key} className="border-t border-border first:border-t-0 hover:bg-transparent">
            <TableCell className="py-2.5 pl-0 whitespace-normal">
              <Link href={row.href} className="font-semibold underline-offset-4 hover:underline">
                {row.model}
              </Link>
              <span className="block type-meta text-muted-foreground md:hidden">
                Model {row.ours}, {row.benchmark} {row.theirs}
              </span>
              <span className="block type-meta text-muted-foreground">{row.measure}</span>
            </TableCell>
            <TableCell className="hidden whitespace-normal text-muted-foreground md:table-cell">{row.benchmark}</TableCell>
            <TableCell className="hidden text-right md:table-cell">{row.ours}</TableCell>
            <TableCell className="hidden text-right text-muted-foreground md:table-cell">{row.theirs}</TableCell>
            <TableCell className="py-2.5">
              <SignedBar
                value={row.diff}
                extent={row.extent}
                digits={row.digits}
                lowerIsBetter={row.lowerIsBetter}
                tone={row.verdict === "noise" ? "neutral" : "semantic"}
              />
              <span className="block type-meta">
                <span className="font-semibold">{row.hasInterval ? VERDICTS[row.verdict] : SIGN_ONLY[row.verdict]}</span>
                {!row.hasInterval && <span className="text-muted-foreground">, sign only, no interval</span>}
              </span>
            </TableCell>
            <TableCell className="hidden pr-0 whitespace-normal type-meta text-muted-foreground lg:table-cell">{row.sample}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
