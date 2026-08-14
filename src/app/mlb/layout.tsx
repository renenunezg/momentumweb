import type { Metadata } from "next";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "MLB Model Predictions",
  description:
    "Daily MLB expected runs predictions, betting edge analysis, and model performance tracking.",
};

export default function MlbLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
