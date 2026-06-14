import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureClientProfile } from "@/lib/auth/bootstrap";

// Server-component guard for /app/*. The proxy (src/proxy.ts) is the primary gate;
// this is defense-in-depth AND the single place the client-surface marker is lazily
// created — never in a GET probe (no side-effecting reads). user.id comes from the
// verified session, never request input (spec §5, §8).
export default async function AppGuardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  await ensureClientProfile(user.id);
  return <>{children}</>;
}
