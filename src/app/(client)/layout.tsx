import Image from "next/image";
import { Tabbar, type TabItem } from "@/components/ui/tabbar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Topbar } from "@/components/ui/topbar";
import { SignOutButton } from "@/components/auth/sign-out-button";

// Routes beyond /app arrive with the screen plans (07+); the tabbar is the
// canonical chrome and tolerates not-yet-existing routes (they 404 until built).
const TABS: TabItem[] = [
  { href: "/app", icon: "search", label: "Home" },
  { href: "/app/games", icon: "stadium", label: "Games" },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Topbar
        rule
        leading={
          <Image src="/squad_logo_horizontal.png" alt="SQUAD" width={96} height={24} priority />
        }
        actions={
          <div className="flex items-center gap-s1">
            <ThemeToggle />
            <SignOutButton />
          </div>
        }
      />
      <main className="flex-1 p-s2">{children}</main>
      <Tabbar items={TABS} />
    </div>
  );
}
