import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Topbar } from "@/components/ui/topbar";

export default function VenueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <Topbar title="SQUAD Venues" rule actions={<ThemeToggle />} />
      <main className="flex-1 p-s2">{children}</main>
    </div>
  );
}
