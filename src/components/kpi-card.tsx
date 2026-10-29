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
      <span className={cn("type-eyebrow text-muted-foreground inline-flex items-center gap-1", compact ? "text-[10px] sm:text-xs" : "text-xs")}>
        {label}
        {tooltip && <InfoTip text={tooltip} />}
      </span>
      <span className={cn("font-mono font-bold tabular-nums", compact ? "text-sm sm:text-base" : "text-base")}>
        {value}
      </span>
      {sub && (
        <span className={cn("font-mono text-muted-foreground tabular-nums", compact ? "text-[11px] sm:text-xs" : "text-xs")}>
          {sub}
        </span>
      )}
    </div>
  );
}
