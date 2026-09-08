import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Empty states, outage messages, and caveats are all one Card, so a padding
// or radius change lands on every one of them at once.
export function Notice({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Card size="sm" className={cn("bg-muted/30", className)} {...props}>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
