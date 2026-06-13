// Native inputs — the vendored CSS styles :checked/:focus-visible via siblings.
// Markup extracted from preview/components_choice.html.
import { cn } from "@/lib/ui/cn";

const CHECK_PATH = "M20 6 9 17l-5-5";

export function Checkbox({
  label,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("sq-check", className)}>
      <input type="checkbox" {...rest} />
      <span className="sq-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4">
          <path d={CHECK_PATH} />
        </svg>
      </span>
      {label}
    </label>
  );
}

export function Radio({
  label,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("sq-choice", className)}>
      <input type="radio" {...rest} />
      <span className="sq-radio-dot" />
      {label}
    </label>
  );
}

export function Switch({
  label,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("sq-switch", className)}>
      <input type="checkbox" role="switch" {...rest} />
      <span className="sq-switch-track">
        <span className="sq-switch-knob" />
      </span>
      {label}
    </label>
  );
}
