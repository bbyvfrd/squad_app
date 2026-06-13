import { cloneElement, isValidElement } from "react";
import { cn } from "@/lib/ui/cn";

type FieldProps = {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Field({ label, name, hint, error, optional, className, children }: FieldProps) {
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? "true" : undefined,
      })
    : children;
  return (
    <div className={cn("sq-field", className)}>
      <label className="sq-field-label" htmlFor={id}>
        {label}
        {optional && <span> · optional</span>}
      </label>
      {control}
      {hint && (
        <p className="sq-field-hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="sq-field-hint" id={errId} style={{ color: "var(--fg-error)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
