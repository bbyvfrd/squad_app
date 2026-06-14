"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

// Boot / splash (artboard 01). Ports `B_Boot`: a centered stacked logo with the
// clay drop-shadow, an indeterminate `.boot-mat` shuttle, and the "Warming up the
// pitch" eyebrow. The phone-frame wrapper is dropped — the `(auth)` layout owns the
// mobile column and the warm-linen surface. The single cold-start decision: probe
// the session and replace() to /app (authed) or /welcome (anon). On any probe
// failure we fall to /welcome — boot must never strand the user on the splash.
export default function BootPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    authClient
      .session()
      .then((user) => {
        if (cancelled) return;
        router.replace(user ? "/app" : "/welcome");
      })
      .catch(() => {
        if (!cancelled) router.replace("/welcome");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: "100dvh",
        alignItems: "center",
      }}
    >
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="boot-mark">
          <img className="boot-clay" src="/auth/logo_stacked.png" width={156} alt="SQUAD" />
        </div>
      </div>
      <div
        style={{
          paddingBottom: 92,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div className="boot-mat" />
        <div className="au-eyebrow" style={{ color: "var(--steel-400)" }}>
          Warming up the pitch
        </div>
      </div>
    </div>
  );
}
