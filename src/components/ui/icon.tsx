import { cn } from "@/lib/ui/cn";
import type { IconName } from "@/lib/ui/icon-names";

type IconProps = {
  name: IconName;
  size?: 16 | 20 | 24 | 32 | 48;
  fill?: boolean; // restricted: one deliberate status glyph per surface
  accent?: boolean; // terracotta pinpoint — max one per card
  label?: string; // provide when the icon carries meaning; otherwise aria-hidden
  className?: string;
};

export function Icon({ name, size = 24, fill, accent, label, className }: IconProps) {
  return (
    <span
      className={cn("sq-icon", `sq-icon-${size}`, fill && "sq-icon-fill", accent && "sq-icon-accent", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {name}
    </span>
  );
}
