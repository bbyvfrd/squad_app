"use client";

import { useId } from "react";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/ui/icon-names";
import { cn } from "@/lib/ui/cn";

type AuFieldProps = {
  label: string;
  icon?: IconName;
  type?: React.HTMLInputTypeAttribute;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  /** trailing control (e.g. the password reveal button) */
  trailing?: React.ReactNode;
};

// Light-variant field from the handoff `Field`. The static mockup faked the input
// with a caret <span>; here it's a real <input>, and the design's `.is-focus`
// becomes a genuine `:focus-within` ring (defined in (auth)/auth.css).
// Leading-icon size: design IconMail/IconUser/IconLock are 21px → nearest Icon size 20.
export function AuField({
  label,
  icon,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  trailing,
}: AuFieldProps) {
  const id = useId();
  return (
    <div className="au-field-light">
      <label className="au-field-label" htmlFor={id}>
        {label}
      </label>
      <div className="au-input-row">
        {icon && (
          <span className="au-input-icon">
            <Icon name={icon} size={20} />
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
        />
        {trailing && <span className={cn("au-input-icon")}>{trailing}</span>}
      </div>
    </div>
  );
}
