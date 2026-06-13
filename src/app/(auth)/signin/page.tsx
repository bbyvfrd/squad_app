"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { AuField } from "@/components/auth/auth-field";
import { AuButton } from "@/components/auth/auth-button";
import { PhoneField } from "@/components/auth/phone-field";
import { MethodTabs, type AuthMethod } from "@/components/auth/method-tabs";
import { BackButton } from "@/components/auth/back-button";
import { RememberToggle } from "@/components/auth/remember-toggle";
import { Divider } from "@/components/auth/divider";
import { SocialRow } from "@/components/auth/social-row";

// Sign in (artboards 09 Email + 10 Phone) as ONE screen with a method toggle.
// Ports `B_LogIn` (email) + `B_Phone` (phone) verbatim: back button, title,
// sub, MethodTabs, then a per-method body. Email → /app; phone →
// /verify?flow=signin. The phone-frame wrapper is dropped; the `(auth)` layout
// owns the centered mobile column. UI only — submits navigate, nothing is sent
// to auth yet.

// From the prototype's `titleStyle()` (base size 34, used as-is on this screen).
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

// Bare reveal control sitting in AuField's trailing `.au-input-icon` slot.
const revealBtnStyle: CSSProperties = {
  display: "flex",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  color: "inherit",
};

export default function SignInPage() {
  const router = useRouter();
  const [method, setMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  function submit() {
    if (method === "email") {
      router.push("/app");
    } else {
      router.push("/verify?flow=signin");
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        padding: "64px 26px 30px",
      }}
    >
      <BackButton onClick={() => router.push("/welcome")} />

      <h1 style={{ ...titleStyle, marginTop: 26, marginBottom: 6 }}>Welcome back</h1>
      <p style={subStyle}>Sign in with email or phone.</p>

      <MethodTabs value={method} onChange={setMethod} />

      {method === "email" ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <AuField
              label="Email"
              icon="mail"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@email.com"
              autoComplete="email"
            />
            <AuField
              label="Password"
              icon="lock"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              trailing={
                <button
                  type="button"
                  style={revealBtnStyle}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((s) => !s)}
                >
                  <Icon name="visibility" size={20} fill={showPassword} />
                </button>
              }
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RememberToggle checked={remember} onChange={setRemember} label="Stay signed in" />
              <span
                style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--steel-500)" }}
              >
                Stay signed in
              </span>
            </div>
            <Link className="au-link" href="/signin" style={{ fontSize: 13 }}>
              Forgot?
            </Link>
          </div>
        </>
      ) : (
        <>
          <PhoneField value={phone} onChange={setPhone} />
          <p
            style={{
              margin: "12px 2px 0",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--steel-400)",
            }}
          >
            We&apos;ll text you a 6-digit code. No password to remember.
          </p>
        </>
      )}

      <div style={{ flex: 1, minHeight: 24 }} />

      <div style={{ marginBottom: 16 }}>
        <AuButton trailingArrow onClick={submit}>
          {method === "email" ? "Log in" : "Send code"}
        </AuButton>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Divider />
      </div>
      <div style={{ marginBottom: 18 }}>
        <SocialRow />
      </div>
      <div className="au-foot au-foot-light">
        New here?{" "}
        <Link className="au-link" href="/signup">
          Create account
        </Link>
      </div>
    </div>
  );
}
