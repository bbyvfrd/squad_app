import { cn } from "@/lib/ui/cn";

export function Topbar({
  title,
  large,
  rule,
  actions,
  leading,
  className,
}: {
  title?: string;
  large?: boolean;
  rule?: boolean;
  actions?: React.ReactNode;
  leading?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("sq-topbar", rule && "has-rule", className)}>
      {leading}
      {title && <span className={cn("sq-topbar-title", large && "is-lg")}>{title}</span>}
      <span className="sq-topbar-spacer" />
      {actions && <div className="sq-topbar-actions">{actions}</div>}
    </div>
  );
}
