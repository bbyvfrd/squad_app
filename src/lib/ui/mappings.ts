// THE single product↔design reconciliation point. Product code speaks DB keys;
// design classes are derived here and nowhere else.
import type { IconName } from "./icon-names";

// DB seed keys — see migrations/0001_signup_trigger_and_sports_seed.sql.
export type SportKey =
  | "football" | "basketball" | "tennis" | "volleyball"
  | "padel" | "running" | "gym" | "swimming";

export const SPORT_UI: Record<SportKey, { className: string; icon: IconName; label: string }> = {
  football: { className: "sq-sport-soccer", icon: "sports_soccer", label: "Football" }, // DB football ↔ CSS soccer
  basketball: { className: "sq-sport-basketball", icon: "sports_basketball", label: "Basketball" },
  tennis: { className: "sq-sport-tennis", icon: "sports_tennis", label: "Tennis" },
  volleyball: { className: "sq-sport-volleyball", icon: "sports_volleyball", label: "Volleyball" },
  padel: { className: "sq-sport-padel", icon: "sports_tennis", label: "Padel" }, // closest Material glyph; swap if a padel glyph ships
  running: { className: "sq-sport-running", icon: "directions_run", label: "Running" },
  gym: { className: "sq-sport-gym", icon: "fitness_center", label: "Gym / Fitness" },
  swimming: { className: "sq-sport-swimming", icon: "pool", label: "Swimming" },
};

// skill_level enum (schema.ts) → .sq-skill tier class.
export type SkillLevel = "beginner" | "intermediate" | "amateur" | "advanced" | "professional";
export const SKILL_UI: Record<SkillLevel, string> = {
  beginner: "lv-1",
  intermediate: "lv-2",
  amateur: "lv-3",
  advanced: "lv-4",
  professional: "lv-5",
};

type BadgeSpec = { className: string; label: string };

// participation_status → .sq-badge variant. Copy per docs/context/design-system.md:
// requested uses the warning-wash class but NEVER the word "Waitlist" (out of v1 scope).
export type ParticipationStatus = "requested" | "approved" | "declined" | "cancelled";
export const PARTICIPATION_BADGE: Record<ParticipationStatus, BadgeSpec> = {
  requested: { className: "is-waiting", label: "Pending" },
  approved: { className: "is-open", label: "Confirmed" },
  declined: { className: "is-full", label: "Declined" }, // jet/neutral treatment — clear, not aggressive
  cancelled: { className: "is-cancelled", label: "Cancelled" },
};

export type GameStatus = "open" | "full" | "cancelled";
export const GAME_BADGE: Record<GameStatus, BadgeSpec> = {
  open: { className: "is-open", label: "Open" },
  full: { className: "is-full", label: "Full" },
  cancelled: { className: "is-cancelled", label: "Cancelled" },
};
