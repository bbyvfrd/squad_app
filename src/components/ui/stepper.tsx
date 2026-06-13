"use client";

import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className={cn("sq-stepper", className)} aria-label={label}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        <Icon name="remove" size={20} />
      </button>
      <span className="val" aria-live="polite" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        <Icon name="add" size={20} />
      </button>
    </div>
  );
}
