import type { Metadata } from "next";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "MLB Model Predictions",
  description:
    "Daily MLB run-distribution forecasts, calibrated win and total probabilities, and model performance tracked against the market.",
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
