import { cn } from "@/lib/ui/cn";

export function AvatarStack({
  names,
  max = 4,
  className,
}: {
  names: string[];
  max?: number;
  className?: string;
}) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <div className={cn("sq-avatars", className)} aria-label={`${names.length} going`}>
      {shown.map((n) => (
        <div key={n} className="sq-av" title={n}>
          {n
            .split(/\s+/)
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
      ))}
      {extra > 0 && <div className="sq-av">+{extra}</div>}
    </div>
  );
}
