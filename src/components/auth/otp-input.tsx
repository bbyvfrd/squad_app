"use client";

import { useRef } from "react";
import { cn } from "@/lib/ui/cn";

const LENGTH = 6;

// `OtpBoxes` from the handoff (`.otp-row` / `.otp-box`), made real: six 1-char
// inputs backed by a single controlled string. Typing fills left-to-right and
// auto-advances; Backspace on an empty box retreats. The focused box shows
// `.is-focus` (the same ring the static mockup faked with a caret).
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
  const digits = value.split("").slice(0, length);

  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1); // last typed numeric char
    const chars = value.split("");
    while (chars.length <= index) chars.push("");
    chars[index] = digit;
    onChange(chars.join(""));
    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
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
            value={digits[i] ?? ""}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            className={cn("otp-cell")}
          />
        </div>
      ))}
    </div>
  );
}
