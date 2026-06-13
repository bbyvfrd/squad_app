import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";
import type { IconName } from "@/lib/ui/icon-names";

const ALERT_ICON: Record<"success" | "warning" | "error" | "info", IconName> = {
  success: "check",
  warning: "warning",
  error: "error",
  info: "info",
};

export function Alert({
  variant,
  title,
  children,
  className,
}: {
  variant: "success" | "warning" | "error" | "info";
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("sq-alert", `is-${variant}`, className)}
      role={variant === "error" ? "alert" : "status"}
    >
      <span className="sq-alert-icon">
        <Icon name={ALERT_ICON[variant]} size={20} fill />
      </span>
      <div className="sq-alert-body">
        <div className="sq-alert-title">{title}</div>
        {children ? <div className="sq-alert-msg">{children}</div> : null}
      </div>
    </div>
  );
}
