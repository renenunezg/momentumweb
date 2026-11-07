import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function PageShell({
  width = "default",
  className,
  ...props
}: ComponentProps<"main"> & { width?: "default" | "reading" | "wide" }) {
  return (
    <main
      id="main"
      data-slot="page"
      className={cn(
        // A short top margin and gap keep the header from pushing the page's
        // content below the first screen.
        "mx-auto flex w-full min-w-0 flex-col gap-6 px-page-gutter pt-6 pb-page-block",
        width === "reading" ? "max-w-3xl" : width === "wide" ? "max-w-7xl" : "max-w-6xl",
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({ className, ...props }: ComponentProps<"header">) {
  return (
    <header
      data-slot="page-header"
      className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-2 [&>div:first-child]:min-w-0 [&>div:first-child]:flex-1", className)}
      {...props}
    />
  );
}

export function PageTitle({ className, ...props }: ComponentProps<"h1">) {
  return <h1 className={cn("type-title text-foreground", className)} {...props} />;
}

export function PageDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("mt-heading max-w-3xl type-body text-muted-foreground", className)}
      {...props}
    />
  );
}

// The line under a page title: the page's context on the left and its update
// stamp on the right, sharing one row whenever both fit.
export function PageMeta({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-heading flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 [&>p]:mt-0", className)}
      {...props}
    />
  );
}

export function PageSection({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      data-slot="page-section"
      className={cn("space-y-content", className)}
      {...props}
    />
  );
}
