"use client";

import { useState, type MouseEvent } from "react";
import { Download, LoaderCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

// A touch device that can hand a file to its share sheet. Read on the tap, so
// the server and the first client render agree.
function sharesFiles(): boolean {
  if (!window.matchMedia("(pointer: coarse)").matches) return false;
  try {
    return navigator.canShare?.({ files: [new File([], "card.png", { type: "image/png" })] }) ?? false;
  } catch {
    return false;
  }
}

// The image fetched for one href, and whether a tap is still loading it or the
// share sheet is waiting on a second tap.
type Shared = { href: string; file: File | null; phase: "idle" | "loading" | "ready" };

// Saves the page's post-sized PNG (share-poster) under a name that says what
// it shows. A plain anchor: next/link would prefetch the image. On a phone a
// download lands in the files app, out of a post's photo picker, so there the
// tap opens the share sheet with the image instead: save to photos or post it.
export function DownloadCardLink({
  href,
  filename,
  label = "Download PNG",
  compact = false,
  className,
}: {
  href: string;
  filename: string;
  label?: string;
  // Icon only on phones, where the link shares a row with the view tabs.
  compact?: boolean;
  className?: string;
}) {
  const [shared, setShared] = useState<Shared | null>(null);
  // The href follows the view, position or unit on screen; an image fetched
  // for another one is not this link's.
  const current = shared?.href === href ? shared : null;
  const phase = current?.phase ?? "idle";

  async function share(event: MouseEvent<HTMLAnchorElement>) {
    if (!sharesFiles()) return;
    event.preventDefault();
    if (phase === "loading") return;
    let file = current?.file ?? null;
    try {
      if (!file) {
        setShared({ href, file: null, phase: "loading" });
        const response = await fetch(href);
        if (!response.ok) throw new Error(`Card image returned ${response.status}`);
        file = new File([await response.blob()], filename, { type: "image/png" });
      }
      await navigator.share({ files: [file] });
      setShared({ href, file, phase: "idle" });
    } catch (error) {
      const reason = error instanceof DOMException ? error.name : null;
      if (reason === "AbortError") {
        // The sheet was dismissed.
        setShared({ href, file, phase: "idle" });
      } else if (reason === "NotAllowedError" && file) {
        // The browser lets a tap open the sheet only briefly, and the image
        // took longer to load. It is in hand now, so the next tap shares it.
        setShared({ href, file, phase: "ready" });
      } else {
        setShared(null);
        window.location.assign(href);
      }
    }
  }

  const Icon = phase === "loading" ? LoaderCircle : phase === "ready" ? Share2 : Download;
  return (
    <a
      href={href}
      download={filename}
      rel="nofollow"
      onClick={share}
      aria-busy={phase === "loading"}
      className={cn(
        // No box of its own: it sits on tab rows and headings whose rules a
        // border would crowd. A caller beside boxed controls adds one.
        "inline-flex items-center justify-center gap-2 rounded-md px-1 py-1.5 type-label text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn("h-4 w-4", phase === "loading" && "animate-spin")} />
      <span className={cn(compact && "max-sm:sr-only")}>{phase === "ready" ? "Tap to share" : label}</span>
    </a>
  );
}
