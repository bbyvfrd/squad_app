import Link from "next/link";
import { cn } from "@/lib/ui/cn";

type BaseProps = { className?: string; children: React.ReactNode };
type CardProps =
  | (BaseProps & { href: string; onClick?: never } & Omit<
        React.ComponentProps<typeof Link>,
        "href" | "className"
      >)
  | (BaseProps & { onClick: React.MouseEventHandler<HTMLButtonElement>; href?: never })
  | (BaseProps & { href?: never; onClick?: never } & React.HTMLAttributes<HTMLDivElement>);

// Interactive cards MUST be focusable/actionable — a tappable <div> is an a11y bug.
export function Card(props: CardProps) {
  if ("href" in props && props.href) {
    const { className, href, ...rest } = props;
    return <Link href={href} className={cn("sq-card", "is-interactive", className)} {...rest} />;
  }
  if ("onClick" in props && props.onClick) {
    const { className, ...rest } = props;
    return (
      <button type="button" className={cn("sq-card", "is-interactive", className)} {...rest} />
    );
  }
  const { className, ...rest } = props as BaseProps & React.HTMLAttributes<HTMLDivElement>;
  return <div className={cn("sq-card", className)} {...rest} />;
}
