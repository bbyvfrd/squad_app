import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";
import type { IconName } from "@/lib/ui/icon-names";

export function IconButton({
  icon,
  label,
  ghost,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string; // required — icon-only controls MUST have a name
  ghost?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn("sq-iconbtn", ghost && "is-ghost", className)}
      {...rest}
    >
      <Icon name={icon} size={24} />
    </button>
  );
}
