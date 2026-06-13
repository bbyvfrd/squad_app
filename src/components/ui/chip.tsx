"use client";

import { cn } from "@/lib/ui/cn";

export function Chip({
  active,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn("sq-chip", active && "is-active", className)}
      {...rest}
    >
      {children}
    </button>
  );
}
