"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { AuField } from "@/components/auth/auth-field";
import { AuButton } from "@/components/auth/auth-button";
import { AuthScreen } from "@/components/auth/auth-screen";
import { PhoneField } from "@/components/auth/phone-field";
import { MethodTabs, type AuthMethod } from "@/components/auth/method-tabs";
import { BackButton } from "@/components/auth/back-button";
import { Divider } from "@/components/auth/divider";
import { SocialRow } from "@/components/auth/social-row";

// Sign up (artboards 05 Email + 06 Phone) as ONE screen with a method toggle.
// Ports `B_SignUp` (email) + `B_SignUpPhone` (phone) verbatim: same header
// (back + 2-dot pager, step 1 of 2), title, sub, MethodTabs, then a per-method
// body. Email → /intent; phone → /verify?flow=signup. The phone-frame wrapper is
// dropped; the `(auth)` layout owns the centered mobile column. UI only — submits
// navigate, nothing is sent to auth yet.

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
  margin: "0 0 20px",
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

export default function SignUpPage() {
  const router = useRouter();
  const [method, setMethod] = useState<AuthMethod>("email");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function submit() {
    if (method === "email") {
      router.push("/intent");
    } else {
      router.push("/verify?flow=signup");
    }
  }

  return (
    <AuthScreen padding="64px 26px 30px">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 26,
        }}
      >
        <BackButton onClick={() => router.push("/welcome")} />
        <div className="au-pager au-pager-light" aria-hidden="true">
          <i className="on" />
          <i />
        </div>
      </div>

      <h1 style={{ ...titleStyle, marginBottom: 6 }}>Create your account</h1>
      <p style={subStyle}>Join games in Baku in under a minute.</p>

      <MethodTabs value={method} onChange={setMethod} />

      {method === "email" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <AuField
            label="Full name"
            icon="person"
            value={fullName}
            onChange={setFullName}
            autoComplete="name"
          />
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
            autoComplete="new-password"
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
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <AuField
              label="Full name"
              icon="person"
              value={fullName}
              onChange={setFullName}
              autoComplete="name"
            />
            <PhoneField value={phone} onChange={setPhone} />
          </div>
          <p
            style={{
              margin: "12px 2px 0",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--steel-400)",
            }}
          >
            We&apos;ll text a 6-digit code to confirm your number.
          </p>
        </>
      )}

      <div style={{ flex: 1, minHeight: 16 }} />

      <div style={{ marginBottom: 16 }}>
        <AuButton trailingArrow onClick={submit}>
          {method === "email" ? "Create account" : "Send code"}
        </AuButton>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Divider />
      </div>
      <div style={{ marginBottom: 18 }}>
        <SocialRow />
      </div>
      <div className="au-foot au-foot-light">
        Already have an account?{" "}
        <Link className="au-link" href="/signin">
          Log in
        </Link>
      </div>
    </AuthScreen>
  );
}
