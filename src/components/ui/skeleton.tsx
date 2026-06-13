import { cn } from "@/lib/ui/cn";

export function Skeleton({
  shape,
  className,
  style,
}: {
  shape?: "line" | "circle";
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn("sq-skeleton", shape && `sq-skeleton-${shape}`, className)}
      style={style}
      aria-hidden
    />
  );
}
