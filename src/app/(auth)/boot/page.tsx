"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Boot / splash (artboard 01). Ports `B_Boot`: a centered stacked logo with the
// clay drop-shadow, an indeterminate `.boot-mat` shuttle, and the "Warming up the
// pitch" eyebrow. The phone-frame wrapper is dropped — the `(auth)` layout owns the
// mobile column and the warm-linen surface. On mount we advance to /welcome after a
// short beat (a real app would redirect after a session check). The auto-advance
// fires regardless of `prefers-reduced-motion`; only the clay/bar animations are
// disabled under that media query (in auth.css).
export default function BootPage() {
  const router = useRouter();

  useEffect(() => {
    const id = setTimeout(() => router.push("/welcome"), 1600);
    return () => clearTimeout(id);
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
