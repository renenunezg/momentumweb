import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

// Saves the page's post-sized PNG (share-poster) under a name that says what
// it shows. A plain anchor: next/link would prefetch the image.
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
  return (
    <a
      href={href}
      download={filename}
      rel="nofollow"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 type-label transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <Download aria-hidden="true" className="h-4 w-4" />
      <span className={cn(compact && "max-sm:sr-only")}>{label}</span>
    </a>
  );
}
