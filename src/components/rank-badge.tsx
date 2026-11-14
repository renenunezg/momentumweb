import { cn } from "@/lib/utils";

const ordinal = (n: number) => {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
};

// A player's place in one ranked list, "#4", with the field size on hover and for screen readers. The top ten stand out.
export function RankBadge({ place, of, className }: { place: number; of: number; className?: string }) {
  const full = `${ordinal(place)} of ${of.toLocaleString("en-US")}`;
  return (
    <span
      title={full}
      aria-label={`Ranked ${full}`}
      className={cn("text-right font-mono text-xs tabular-nums", place <= 10 ? "font-semibold text-foreground" : "text-muted-foreground", className)}
    >
      #{place}
    </span>
  );
}
