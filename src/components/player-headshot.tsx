"use client";

import Image from "next/image";
import { useState } from "react";

export function PlayerHeadshot({ name, src }: { name: string; src: string | null }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("");
  const showImage = src?.startsWith("https://") && failedSrc !== src;
  return <span aria-hidden="true" className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted align-middle">
    {src && showImage ? <Image src={src} alt="" width={48} height={48} unoptimized
      className="h-full w-full object-contain" onError={() => setFailedSrc(src)} />
      : <span className="font-mono text-sm text-muted-foreground">{initials}</span>}
  </span>;
}
