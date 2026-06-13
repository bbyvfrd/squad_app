import { redirect } from "next/navigation";

// No standalone landing page in v1 — the app entry is the first-run/auth flow.
// (When auth is wired this becomes session-aware: signed-in → /app, otherwise → /boot.)
export default function RootPage() {
  redirect("/boot");
}
