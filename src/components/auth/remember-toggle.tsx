"use client";

import { cn } from "@/lib/ui/cn";

// "Stay signed in" switch — `.au-toggle`/`.au-toggle.on` with the sliding knob.
// The static mockup used an inert <span>; here it's a real role="switch" button
// with aria-checked so it's operable and announced. Controlled.
export function RememberToggle({
  checked,
  onChange,
  label = "Stay signed in",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cn("au-toggle", checked ? "on" : "off")}
      onClick={() => onChange(!checked)}
    >
      <b />
    </button>
  );
}
