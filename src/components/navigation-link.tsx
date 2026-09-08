"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";

function NavigationContent({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return <>
    <span className={pending ? "opacity-50" : undefined}>{children}</span>
    <span role="status" className="sr-only">{pending ? "Loading page" : ""}</span>
  </>;
}

export function NavigationLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}><NavigationContent>{children}</NavigationContent></Link>;
}
