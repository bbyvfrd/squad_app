"use client";

import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuButton } from "@/components/auth/auth-button";
import { BackButton } from "@/components/auth/back-button";
import { OtpInput } from "@/components/auth/otp-input";

// Verify code (artboard 07 OTP). Ports `B_OTP` verbatim: back affordance, title,
// "Sent to … · Edit" sub (Edit returns to the previous screen), the real 6-box
// OtpInput, a live resend countdown, and a flow-aware CTA. The phone-frame wrapper
// is dropped; the `(auth)` layout owns the centered mobile column. UI only — Verify
// navigates by `?flow` (signup → /intent, otherwise → /app); nothing hits auth yet.

// From the prototype's `titleStyle()` (base size 34, used as-is on this screen).
const titleStyle: CSSProperties = {
  margin: 0,
  marginBottom: 6,
  fontFamily: "var(--font-sans)",
  fontWeight: 800,
  fontSize: 34,
  lineHeight: 1.04,
  letterSpacing: "-0.02em",
  color: "var(--steel-700)",
};

const subStyle: CSSProperties = {
  margin: "0 0 28px",
  fontFamily: "var(--font-body)",
  fontSize: 15,
  color: "var(--steel-500)",
};

// Bare "Edit" link sitting inline in the sub copy — styled as `.au-link`.
const editBtnStyle: CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  font: "inherit",
  cursor: "pointer",
};

const RESEND_SECONDS = 28;

// `useSearchParams` must live under a Suspense boundary in the App Router, or the
// route is forced fully dynamic / the build complains. Keep the search-param read
// (and the rest of the interactive screen) inside `VerifyInner`.
function VerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick the resend countdown down to 0. Split out from `startCountdown` so the
  // mount effect can start the interval WITHOUT a synchronous setState (the
  // `react-hooks/set-state-in-effect` rule forbids that — and the initial value is
  // already RESEND_SECONDS via useState, so the reset is only needed on Resend).
  function runInterval() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  // Event-handler path (Resend button): resetting state synchronously here is fine.
  function startCountdown() {
    setSecondsLeft(RESEND_SECONDS);
    runInterval();
  }

  useEffect(() => {
    runInterval();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function verify() {
    // Flow-aware next step: a fresh sign-up continues to personalization; an
    // existing account lands in the app.
    router.push(searchParams.get("flow") === "signup" ? "/intent" : "/app");
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
      <div style={{ marginBottom: 26 }}>
        <BackButton />
      </div>

      <h1 style={titleStyle}>Enter the code</h1>
      <p style={subStyle}>
        Sent to +994 50 123 45 67 ·{" "}
        <button
          type="button"
          className="au-link"
          style={editBtnStyle}
          onClick={() => router.back()}
        >
          Edit
        </button>
      </p>

      <OtpInput value={code} onChange={setCode} />

      <div className="au-resend" style={{ marginTop: 18 }}>
        {secondsLeft > 0 ? (
          `Resend code in 0:${String(secondsLeft).padStart(2, "0")}`
        ) : (
          <button type="button" className="au-link" style={editBtnStyle} onClick={startCountdown}>
            Resend
          </button>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 24 }} />

      <div style={{ marginBottom: 16 }}>
        <AuButton trailingArrow onClick={verify}>
          Verify
        </AuButton>
      </div>
      <div className="au-foot au-foot-light">
        Didn&apos;t get a code?{" "}
        <button type="button" className="au-link" style={editBtnStyle} onClick={startCountdown}>
          Resend
        </button>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
