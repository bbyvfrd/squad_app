import { cn } from "@/lib/ui/cn";
import { SKILL_UI, type SkillLevel } from "@/lib/ui/mappings";

const LABEL: Record<SkillLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  amateur: "Amateur",
  advanced: "Advanced",
  professional: "Professional",
};

export function SkillTag({ level, className }: { level: SkillLevel; className?: string }) {
  return (
    <span className={cn("sq-skill", SKILL_UI[level], className)}>
      <span className="dot" aria-hidden />
      {LABEL[level]}
    </span>
  );
}
