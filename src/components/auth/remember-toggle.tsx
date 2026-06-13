"use client";

import { cn } from "@/lib/ui/cn";

// "Stay signed in" switch — `.au-toggle`/`.au-toggle.on` with the sliding knob.
// The static mockup used an inert <span>; here it's a real role="switch" button
// with aria-checked so it's operable and announced. Controlled.
//
// Accessible name: pass `labelledBy` (the id of a visible label element) so the
// visible text IS the accessible name and isn't announced twice. Fall back to the
// `label` string (`aria-label`) only when no `labelledBy` is given.
export function RememberToggle({
  checked,
  onChange,
  label = "Stay signed in",
  labelledBy,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  labelledBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className={cn("au-toggle", checked ? "on" : "off")}
      onClick={() => onChange(!checked)}
    >
      <b />
    </button>
  );
}
