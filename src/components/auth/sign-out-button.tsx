"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@/components/ui/icon-button";
import { authClient } from "@/lib/auth/client";

// In-app sign-out (§6). Lives in the client Topbar actions, beside ThemeToggle.
// Clears the session cookie via /api/v1/auth/signout, then replaces to /welcome so
// back-nav can't return to an authed screen. Uses the UI IconButton (ghost) to
// match ThemeToggle and keep canonical sq-* class derivation inside src/components/ui/.
export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await authClient.signOut();
    } finally {
      router.replace("/welcome");
    }
  }

  return <IconButton icon="logout" label="Sign out" ghost disabled={busy} onClick={signOut} />;
}
