import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AboutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className="relative z-10 border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-heading text-lg tracking-tight">
            Rene Nunez
          </Link>
          <ThemeToggle />
        </div>
      </header>
      {children}
    </>
  );
}
