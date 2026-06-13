"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/ui/cn";

export type AuthMethod = "email" | "phone";

// `MethodTabs` from the handoff — two icon buttons (mail/Email, smartphone/Phone);
// the active one gets `.is-active`. Real buttons + aria-pressed so it's a proper
// toggle. Icon sizes: design 21px (mail) / 20px (smartphone) → nearest Icon size 20.
export function MethodTabs({
  value,
  onChange,
}: {
  value: AuthMethod;
  onChange: (value: AuthMethod) => void;
}) {
  return (
    <div className="method-row">
      <button
        type="button"
        aria-pressed={value === "email"}
        className={cn("method-btn", value === "email" && "is-active")}
        onClick={() => onChange("email")}
      >
        <Icon name="mail" size={20} /> Email
      </button>
      <button
        type="button"
        aria-pressed={value === "phone"}
        className={cn("method-btn", value === "phone" && "is-active")}
        onClick={() => onChange("phone")}
      >
        <Icon name="smartphone" size={20} /> Phone
      </button>
    </div>
  );
}
