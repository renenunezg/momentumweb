// Kept out of the "use client" tab components: a server component importing a
// constant from a client module receives a client reference, not the string.

// One underline-tab look for every tab bar, link row and filter on the site.
// One row that scrolls sideways on narrow screens rather than wrapping. The
// baseline is an inset shadow, not a border: the scroll container clips a
// tab's negative margin, and the tabs' own underline paints over a shadow.
export const TAB_LIST =
  "flex items-center gap-x-2 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)] [scrollbar-width:none]";
export const TAB_ITEM =
  "shrink-0 whitespace-nowrap rounded-t-md border-b-2 px-3 py-2.5 type-label font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const TAB_ON = "border-primary text-foreground";
export const TAB_OFF = "border-transparent text-muted-foreground hover:text-foreground";
