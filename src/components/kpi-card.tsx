"use client";

import { cn } from "@/lib/utils";
import { InfoTip } from "@/components/info-tip";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  tooltip?: string;
  compact?: boolean;
}

export function KpiCard({ label, value, sub, tooltip, compact = false }: KpiCardProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", compact && "items-center text-center")}>
      <span className="inline-flex items-center gap-1 type-eyebrow text-muted-foreground">
        {label}
        {tooltip && <InfoTip text={tooltip} />}
      </span>
      <span className={cn("tabular-nums", compact ? "type-subsection" : "type-section")}>
        {value}
      </span>
      {sub && (
        <span className="type-meta tabular-nums text-muted-foreground">
          {sub}
        </span>
      )}
    </div>
  );
}
