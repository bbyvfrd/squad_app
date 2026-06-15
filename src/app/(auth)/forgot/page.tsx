"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuField } from "@/components/auth/auth-field";
import { AuButton } from "@/components/auth/auth-button";
import { AuthScreen } from "@/components/auth/auth-screen";
import { BackButton } from "@/components/auth/back-button";

// Forgot password — UI-only stub (deferred seam, §10). No email round-trip is
// wired this plan; the CTA shows a static confirmation so the screen reads as
// complete without sending anything. Reset will land with its own plan.
const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-sans)",
  fontWeight: 800,
  fontSize: 34,
  lineHeight: 1.04,
  letterSpacing: "-0.02em",
  color: "var(--steel-700)",
};

const subStyle: CSSProperties = {
  margin: "0 0 22px",
  fontFamily: "var(--font-body)",
  fontSize: 15,
  color: "var(--steel-500)",
};

export default function ForgotPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <AuthScreen padding="64px 26px 30px">
      <BackButton onClick={() => router.push("/signin")} />

      <h1 style={{ ...titleStyle, marginTop: 26, marginBottom: 6 }}>Reset your password</h1>
      <p style={subStyle}>Enter your email and we&apos;ll send reset steps.</p>

      <AuField
        label="Email"
        icon="mail"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@email.com"
        autoComplete="email"
      />

      <div style={{ flex: 1, minHeight: 24 }} />

      {sent && (
        <p
          role="status"
          style={{
            margin: "0 0 12px",
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "var(--steel-500)",
          }}
        >
          If that email exists, reset steps are on the way.
        </p>
      )}

      <div style={{ marginBottom: 16 }}>
        <AuButton trailingArrow onClick={() => setSent(true)}>
          Send reset link
        </AuButton>
      </div>
      <div className="au-foot au-foot-light">
        Remembered it?{" "}
        <Link className="au-link" href="/signin">
          Log in
        </Link>
      </div>
    </AuthScreen>
  );
}
