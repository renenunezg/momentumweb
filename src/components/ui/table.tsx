"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Table({
  className,
  density = "default",
  ...props
}: React.ComponentProps<"table"> & {
  density?: "default" | "compact" | "comfortable"
}) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        data-density={density}
        className={cn(
          "w-full caption-bottom border-collapse text-sm tabular-nums [--table-cell-x:0.5rem] [--table-cell-y:0.375rem] [--table-group-gap:0.75rem]",
          density === "compact" && "[--table-cell-x:0.25rem] sm:[--table-cell-x:0.5rem]",
          density === "comfortable" && "[--table-cell-y:0.75rem]",
          className
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    // Booktabs: a rule above the header and one below it, none between rows.
    <thead
      data-slot="table-header"
      className={cn("border-y border-rule-strong", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("border-b border-rule-strong", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      // No rules between body rows; hover carries row tracking instead.
      className={cn(
        "transition-colors hover:bg-muted/60 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({
  className,
  scope = "col",
  ...props
}: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn(
        "h-8 px-[var(--table-cell-x)] py-2 text-left align-middle font-mono text-xs font-normal uppercase tracking-wider whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-[var(--table-cell-x)] py-[var(--table-cell-y)] align-middle whitespace-nowrap font-mono text-sm [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
