// Canonical type roles as components — keeps sq-* type classes inside the layer.
import { cn } from "@/lib/ui/cn";

type Role = "display" | "headline" | "title" | "lede" | "label" | "kicker";
const TAG: Record<Role, "h1" | "h2" | "p" | "span"> = {
  display: "h1",
  headline: "h1",
  title: "h2",
  lede: "p",
  label: "span",
  kicker: "span",
};

export function Text({
  role,
  as,
  className,
  ...rest
}: React.HTMLAttributes<HTMLElement> & {
  role: Role;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
}) {
  const Tag = (as ?? TAG[role]) as React.ElementType;
  return <Tag className={cn(`sq-${role}`, className)} {...rest} />;
}
