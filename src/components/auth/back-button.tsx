"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/ui/cn";

// `.au-icon-btn.au-icon-btn-light` back affordance. Defaults to router.back();
// pass `onClick` to override (e.g. a screen that must return to a fixed route).
// Design IconChevronLeft is `arrow_back` at 22px → nearest Icon size 24.
export function BackButton({ onClick, className }: { onClick?: () => void; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={onClick ?? (() => router.back())}
      className={cn("au-icon-btn", "au-icon-btn-light", className)}
    >
      <Icon name="arrow_back" size={24} label="Back" />
    </button>
  );
}
