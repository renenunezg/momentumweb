import { BaseDiamond } from "@/components/base-diamond";

export function MlbBaseOutState({ bases, outs }: { bases?: number | null; outs?: number | null }) {
  if (bases == null && outs == null) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      {bases != null && <BaseDiamond bases={bases} />}
      {outs != null && (
        <span className="whitespace-nowrap text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
          {outs} {outs === 1 ? "out" : "outs"}
        </span>
      )}
    </span>
  );
}
