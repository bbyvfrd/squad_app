import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/ui/cn";

type AuButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  /** show the trailing forward arrow (design IconArrowRight, 20px) */
  trailingArrow?: boolean;
  className?: string;
};

// Primary CTA — `.au-btn .au-btn-primary.is-clay` (the single terracotta spike).
export function AuButton({
  children,
  onClick,
  type = "button",
  trailingArrow = false,
  className,
}: AuButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn("au-btn", "au-btn-primary", "is-clay", className)}
    >
      {children}
      {trailingArrow && <Icon name="arrow_forward" size={20} />}
    </button>
  );
}

type SocialButtonProps = {
  /** brand mark (GoogleMark / AppleMark) — the only SVG in auth */
  mark: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
};

// `.au-btn .au-btn-social .au-btn-social-light` — outlined neutral button.
export function SocialButton({ mark, label, onClick, className }: SocialButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("au-btn", "au-btn-social", "au-btn-social-light", className)}
    >
      {mark} {label}
    </button>
  );
}
