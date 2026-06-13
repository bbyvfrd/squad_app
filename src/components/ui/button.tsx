import { cn } from "@/lib/ui/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "lg";
};

export function Button({
  variant = "primary",
  size,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn("sq-btn", `sq-btn-${variant}`, size && `sq-btn-${size}`, className)}
      {...rest}
    />
  );
}
