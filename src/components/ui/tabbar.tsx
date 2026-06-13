"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";
import type { IconName } from "@/lib/ui/icon-names";

export type TabItem = { href: string; icon: IconName; label: string };

export function Tabbar({ items }: { items: TabItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="sq-tabbar" aria-label="Primary">
      {items.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn("sq-tab", active && "is-active")}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={t.icon} size={24} fill={active} />
            <span className="sq-tab-label">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
