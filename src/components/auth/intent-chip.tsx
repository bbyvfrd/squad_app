"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/ui/cn";

// `Chip` from the handoff — a toggle pill that shows a leading check when on.
// Self-contained toggle state (the intent screen is local-only, writes nothing),
// seeded by `defaultOn`. aria-pressed reflects the on/off state.
// The check glyph is 15px in the design → nearest Icon size 16.
export function IntentChip({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cn("chip", on && "is-on")}
      onClick={() => setOn((v) => !v)}
    >
      {on && <Icon name="check" size={16} />}
      {label}
    </button>
  );
}

// `ChipGroup` — a labelled cluster of chips (`.chip-group` → label + `.chip-wrap`).
export function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="chip-group">
      <div className="chip-grouplabel">{label}</div>
      <div className="chip-wrap">{children}</div>
    </div>
  );
}
