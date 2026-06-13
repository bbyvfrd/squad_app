import { cn } from "@/lib/ui/cn";

export function Badge({
  variant,
  className,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  return <span className={cn("sq-badge", variant, className)} {...rest} />;
}

export function Dot({
  variant,
  live,
  className,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "success" | "warning" | "error" | "info";
  live?: boolean;
}) {
  return (
    <span
      className={cn("sq-dot", variant && `is-${variant}`, live && "is-live", className)}
      aria-hidden
      {...rest}
    />
  );
}
