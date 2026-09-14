"use client";

import { useEffect, useState } from "react";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "data", label: "Data" },
  { id: "windows", label: "Windows" },
  { id: "goal-map", label: "Goal Map" },
  { id: "ratings", label: "Ratings" },
  { id: "matchup", label: "Matchup" },
  { id: "pricing", label: "Pricing" },
  { id: "picks", label: "Picks" },
  { id: "backtest", label: "Backtest" },
  { id: "limits", label: "Limits" },
  { id: "stack", label: "Tech Stack" },
];

export function TableOfContents() {
  const [activeId, setActiveId] = useState("overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-10% 0px -75% 0px" },
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="On this page" className="hidden lg:block">
      <ul className="sticky top-6 space-y-1 font-mono text-xs uppercase tracking-wider">
        {sections.map(({ id, label }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={activeId === id ? "location" : undefined}
              className={
                activeId === id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
