"use client";

import { useId } from "react";
import { Icon } from "@/components/ui/icon";

// `PhoneField` from the handoff — a fixed "+994" country-code button (no emoji
// flags, per the brand rule) followed by a real tel <input>. Edits the local part
// only; the prefix is static in this UI pass. expand_more is 18px → nearest size 20.
export function PhoneField({
  value,
  onChange,
  placeholder = "50 123 45 67",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="au-field-light">
      <label className="au-field-label" htmlFor={id}>
        Phone number
      </label>
      <div className="au-input-row">
        <button type="button" className="au-phone-cc" aria-label="Country code, +994">
          +994 <Icon name="expand_more" size={20} />
        </button>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
