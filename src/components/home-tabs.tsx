"use client";

import { useState, type ReactNode } from "react";
import { ViewTabPanel, ViewTabs } from "@/components/view-tabs";

// Server-rendered panels behind the site's tab bar; only the selection lives
// on the client.
export function HomeTabs({
  label,
  panels,
}: {
  label: string;
  panels: { key: string; label: string; content: ReactNode }[];
}) {
  const [value, setValue] = useState(panels[0]?.key ?? "");
  return (
    <ViewTabs label={label} options={panels} value={value} onValueChange={setValue} className="space-y-3">
      {panels.map((panel) => (
        <ViewTabPanel key={panel.key} value={panel.key}>
          {panel.content}
        </ViewTabPanel>
      ))}
    </ViewTabs>
  );
}
