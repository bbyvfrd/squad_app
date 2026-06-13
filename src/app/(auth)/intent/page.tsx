"use client";

import { useRouter } from "next/navigation";
import { type CSSProperties } from "react";
import { AuButton } from "@/components/auth/auth-button";
import { BackButton } from "@/components/auth/back-button";
import { IntentChip, ChipGroup } from "@/components/auth/intent-chip";
import { VendorLaunch } from "@/components/auth/vendor-launch";

// Intent / personalization (artboard 08). Ports `B_Intent` verbatim: back affordance
// + a bare "Skip" pill, a title with the terracotta spike on "SQUAD?", an optional
// sub, three chip groups (What you're here for / Your pace / Sports), the venue
// launch row, and a Continue CTA. The phone-frame wrapper is dropped; the `(auth)`
// layout owns the centered mobile column.
//
// WRITES NOTHING. This screen is purely cosmetic — there is no data model for intent
// yet, so the chip selection lives entirely in each IntentChip's local state (seeded
// by `defaultOn`). It never blocks the flow and persists nothing; Skip and Continue
// both land in /app. Persisting the selection is deferred (needs a data model).

// From the prototype's `titleStyle()`, overridden to fontSize 29 per `B_Intent`.
const titleStyle: CSSProperties = {
  margin: 0,
  marginBottom: 5,
  fontFamily: "var(--font-sans)",
  fontWeight: 800,
  fontSize: 29,
  lineHeight: 1.04,
  letterSpacing: "-0.02em",
  color: "var(--steel-700)",
};

// The single terracotta word — the one accent spike on this surface.
const terra: CSSProperties = { color: "var(--terra-500)" };

const subStyle: CSSProperties = {
  margin: "0 0 20px",
  fontFamily: "var(--font-body)",
  fontSize: 14,
  color: "var(--steel-500)",
};

export default function IntentPage() {
  const router = useRouter();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        padding: "62px 24px 28px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <BackButton onClick={() => router.push("/signup")} />
        <button type="button" className="chip-skip" onClick={() => router.push("/app")}>
          Skip
        </button>
      </div>

      <h1 style={titleStyle}>
        How will you use <span style={terra}>SQUAD?</span>
      </h1>
      <p style={subStyle}>Pick anything that fits — it just tailors your home. Optional.</p>

      <ChipGroup label="What you're here for">
        <IntentChip label="Organize games" defaultOn />
        <IntentChip label="Join pickup games" defaultOn />
        <IntentChip label="Find players for my games" />
        <IntentChip label="Find a regular squad" />
        <IntentChip label="Meet new people" />
      </ChipGroup>

      <ChipGroup label="Your pace">
        <IntentChip label="Play weekly" defaultOn />
        <IntentChip label="Casual kickabouts" />
        <IntentChip label="Competitive matches" />
      </ChipGroup>

      <ChipGroup label="Sports">
        <IntentChip label="Soccer" defaultOn />
        <IntentChip label="Futsal" />
        <IntentChip label="Basketball" />
        <IntentChip label="Tennis" />
        <IntentChip label="Padel" />
      </ChipGroup>

      <div style={{ flex: 1, minHeight: 10 }} />

      <div style={{ marginBottom: 14 }}>
        <VendorLaunch />
      </div>

      <AuButton trailingArrow onClick={() => router.push("/app")}>
        Continue
      </AuButton>
    </div>
  );
}
