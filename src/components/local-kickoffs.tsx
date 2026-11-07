"use client";

import { useRef, type ReactNode } from "react";
import { useVisitorKickoffs } from "@/components/use-visitor-timezone";

// Shows server-rendered kickoffs in the visitor's zone and says which zone.
export function LocalKickoffs({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const clock = useVisitorKickoffs(container, children);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Times shown in {clock.zone()}.
      </p>
      <div ref={container}>{children}</div>
    </div>
  );
}
