"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// Browsers with the va-disable flag set in localStorage send nothing, which
// keeps the owner's own visits out of the dashboard. Set it once per browser:
// localStorage.setItem("va-disable", "1")
export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) =>
        localStorage.getItem("va-disable") ? null : event
      }
    />
  );
}
