"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";
import type { IconName } from "@/lib/ui/icon-names";

export type TabItem = { href: string; icon: IconName; label: string };

export function Tabbar({ items }: { items: TabItem[] }) {
  const pathname = usePathname();
  // Active = the item whose href is the LONGEST prefix of the current path. This
  // keeps an index tab (e.g. "/app") from also matching every sub-route, so only
  // one tab is ever active (no duplicate aria-current).
  const activeHref = items
    .filter((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className="sq-tabbar" aria-label="Primary">
      {items.map((t) => {
        const active = t.href === activeHref;
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
