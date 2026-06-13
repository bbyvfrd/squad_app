import {
  GAME_BADGE,
  PARTICIPATION_BADGE,
  type GameStatus,
  type ParticipationStatus,
} from "@/lib/ui/mappings";
import { Badge } from "./badge";

type StatusBadgeProps =
  | { kind: "participation"; status: ParticipationStatus; className?: string }
  | { kind: "game"; status: GameStatus; className?: string };

export function StatusBadge({ kind, status, className }: StatusBadgeProps) {
  const spec = kind === "participation" ? PARTICIPATION_BADGE[status] : GAME_BADGE[status];
  return (
    <Badge variant={spec.className} className={className}>
      {spec.label}
    </Badge>
  );
}
