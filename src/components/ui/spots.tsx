import { cn } from "@/lib/ui/cn";

export function Spots({
  taken,
  capacity,
  className,
}: {
  taken: number;
  capacity: number;
  className?: string;
}) {
  const left = Math.max(0, capacity - taken);
  const pct = capacity > 0 ? Math.round((taken / capacity) * 100) : 0;
  const state = left === 0 ? "is-full" : left <= 2 ? "is-filling" : "is-open";
  return (
    <div className={cn("sq-spots", className)}>
      <div className="sq-spots-row">
        <span className="sq-spots-label">
          {taken}/{capacity} players
        </span>
        <span className={cn("sq-spots-state", state)}>
          {left === 0 ? "Full" : `${left} spots left`}
        </span>
      </div>
      <div className="sq-spots-track" role="img" aria-label={`${taken} of ${capacity} spots taken`}>
        <div className={cn("sq-spots-fill", state)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
