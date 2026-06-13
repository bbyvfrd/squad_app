import { cn } from "@/lib/ui/cn";
import { SPORT_UI, type SportKey } from "@/lib/ui/mappings";
import { Icon } from "./icon";

export function SportChip({ sport, className }: { sport: SportKey; className?: string }) {
  const ui = SPORT_UI[sport];
  return (
    <span className={cn("sq-sportchip", ui.className, className)} title={ui.label}>
      <Icon name={ui.icon} size={20} label={ui.label} />
    </span>
  );
}
