"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/ui/cn";

const LENGTH = 6;

// `OtpBoxes` from the handoff (`.otp-row` / `.otp-box`), made real: six 1-char
// inputs backed by a FIXED-LENGTH cell array (the source of truth), not a packed
// string. Each cell is addressed by index, so deleting or editing a middle cell —
// or typing out of order — only touches that index and never shifts the others.
// `value`/`onChange` stay a joined string for the parent; the array is mirrored to
// it (trailing blanks trimmed) on every edit, and re-seeded from `value` if the
// parent changes it externally (e.g. a reset). Typing fills the focused cell and
// auto-advances; Backspace on an empty box retreats. The focused box shows the
// `:focus-within` ring (the same ring the static mockup faked with a caret).
export function OtpInput({
  value,
  onChange,
  length = LENGTH,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [cells, setCells] = useState<string[]>(() => seed(value, length));

  // Re-seed if the parent set `value` to something that doesn't match our cells
  // (external reset/prefill). Internal edits already keep the two in sync, so this
  // is a no-op during normal typing and won't clobber positional blanks.
  if (joinCode(cells) !== value) {
    const seeded = seed(value, length);
    if (joinCode(seeded) === value) setCells(seeded);
  }

  function commit(next: string[]) {
    setCells(next);
    onChange(joinCode(next));
  }

  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1); // last typed numeric char ("" clears)
    const next = cells.slice();
    next[index] = digit;
    commit(next);
    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !cells[index] && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  }

  return (
    <div className="otp-row">
      {Array.from({ length }).map((_, i) => (
        <div key={i} className="otp-box">
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            value={cells[i] ?? ""}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            className={cn("otp-cell")}
          />
        </div>
      ))}
    </div>
  );
}

// Fixed-length positional array from a string (used for the initial seed and for
// external `value` changes). Position i is `value[i]` or "" — never re-packed.
function seed(value: string, length: number): string[] {
  return Array.from({ length }, (_, i) => value[i] ?? "");
}

// Joined string for the parent: drop only TRAILING blanks so a complete code is a
// clean 6-char string (length === code count). The seed/round-trip check above keeps
// the controlled contract honest for the no-interior-gap states the flow produces.
function joinCode(cells: string[]): string {
  return cells.join("").replace(/\s+$/, "");
}
