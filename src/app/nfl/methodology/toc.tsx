"use client";

import { useEffect, useState } from "react";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "example", label: "Example" },
  { id: "data", label: "Data" },
  { id: "engine", label: "Rating Engine" },
  { id: "adjustments", label: "QB & Rest" },
  { id: "blend", label: "Market Blend" },
  { id: "preseason", label: "Preseason" },
  { id: "units", label: "Unit Ratings" },
  { id: "backtest", label: "Backtest" },
  { id: "picks", label: "Predictions" },
  { id: "season-wins", label: "Season Wins" },
  { id: "awards", label: "Awards" },
  { id: "limits", label: "Limits" },
];

export function TableOfContents() {
  const [activeId, setActiveId] = useState("overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-10% 0px -75% 0px" }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <nav
          aria-label="On this page"
          className="sticky top-6 flex flex-col gap-0.5"
        >
          <p className="type-eyebrow mb-2 text-muted-foreground">
            Contents
          </p>
          {sections.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={activeId === id ? "true" : undefined}
              className={`border-l-2 py-1 pl-3 type-eyebrow transition-colors ${
                activeId === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Mobile horizontal strip */}
      <div className="lg:hidden mb-6 overflow-x-auto border-b border-border pb-3">
        <nav aria-label="On this page" className="flex gap-0 min-w-max">
          {sections.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={activeId === id ? "true" : undefined}
              className={`border-b-2 px-3 py-1.5 type-eyebrow whitespace-nowrap transition-colors ${
                activeId === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
