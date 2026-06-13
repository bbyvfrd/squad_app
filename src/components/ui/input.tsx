import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";
import type { IconName } from "@/lib/ui/icon-names";

export function Input({
  className,
  invalid,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn("sq-input", invalid && "is-error", className)} {...rest} />;
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("sq-textarea", className)} {...rest} />;
}

export function Select({ className, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("sq-select", className)} {...rest} />;
}

// Icon-inside-field row: the row carries border + focus; input is bare.
export function InputRow({
  icon,
  className,
  children,
}: {
  icon: IconName;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("sq-input-row", className)}>
      <span className="sq-input-ic">
        <Icon name={icon} size={20} />
      </span>
      {children}
    </div>
  );
}
