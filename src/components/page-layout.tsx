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
        "mx-auto flex w-full min-w-0 flex-col gap-section px-page-gutter py-page-block",
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
      className={cn("flex flex-wrap items-end justify-between gap-4", className)}
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

export function PageSection({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      data-slot="page-section"
      className={cn("space-y-content", className)}
      {...props}
    />
  );
}
