"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CfbPerformanceTabs({
  recommendations,
  accuracy,
}: {
  recommendations: ReactNode;
  accuracy: ReactNode;
}) {
  return (
    <Tabs defaultValue="picks">
      <TabsList className="mb-6">
        <TabsTrigger value="picks">Recommendations</TabsTrigger>
        <TabsTrigger value="accuracy">Forecast accuracy</TabsTrigger>
      </TabsList>
      <TabsContent value="picks">{recommendations}</TabsContent>
      <TabsContent value="accuracy">{accuracy}</TabsContent>
    </Tabs>
  );
}
