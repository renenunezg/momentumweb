"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

function NavigationContent({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return <>
    <span className={pending ? "opacity-50" : undefined}>{children}</span>
    <span role="status" className="sr-only">{pending ? "Loading page" : ""}</span>
  </>;
}

export function NavigationLink({ children, className, ...props }: ComponentProps<typeof Link>) {
  // Contain the status label when a link lives inside a horizontal scroller.
  return <Link className={cn("relative", className)} {...props}><NavigationContent>{children}</NavigationContent></Link>;
}
