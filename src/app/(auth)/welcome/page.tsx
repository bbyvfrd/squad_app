"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { type IconName } from "@/lib/ui/icon-names";
import { AuButton } from "@/components/auth/auth-button";
import { Pager } from "@/components/auth/pager";

// Onboarding intro (artboards 02–04). Ports `OnbSlide` + `B_Onb1..3` as ONE carousel
// driven by client state (slide 0–2). Slide 0 shows the `clay_map.png` hero; slides
// 1–2 show the marked placeholder visual exactly as `OnbSlide` renders when `image`
// is absent. The phone-frame wrapper is dropped — the `(auth)` layout owns the column.
// Non-final slides advance via the circular `.au-next` button; the final slide swaps
// it for the Get-started CTA → /signup and a "Log in" footer → /signin.

// Title type from the prototype's `titleStyle()`, overridden per slide to fontSize 30.
const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-sans)",
  fontWeight: 800,
  fontSize: 30,
  lineHeight: 1.08,
  letterSpacing: "-0.02em",
  color: "var(--steel-700)",
};

// One terracotta word per title — the single accent spike.
const terra: CSSProperties = { color: "var(--terra-500)" };

type Slide = {
  eyebrow: string;
  title: ReactNode;
  sub: string;
  // hero slide carries an image; placeholder slides carry chip icon + caption + tag.
  image?: string;
  chipIcon?: IconName;
  caption?: string;
  tag?: string;
};

const SLIDES: Slide[] = [
  {
    eyebrow: "01 · Discover",
    title: (
      <span>
        Games on a <span style={terra}>map</span> near you
      </span>
    ),
    sub: "Browse open pickup games across Baku — see the time, format and skill level before you ever commit.",
    image: "/auth/clay_map.png",
    tag: "Map view",
  },
  {
    eyebrow: "02 · Join",
    title: (
      <span>
        Claim your spot in <span style={terra}>one tap</span>
      </span>
    ),
    sub: "Reserve a place, see who else is playing, and get a reminder so the game never falls apart.",
    chipIcon: "bolt",
    caption: "Game detail — roster, kickoff time and venue",
    tag: "Game detail",
  },
  {
    eyebrow: "03 · Organize",
    title: (
      <span>
        Run a squad that <span style={terra}>shows up</span>
      </span>
    ),
    sub: "Create games, lock your roster, and keep your regulars coming back week after week.",
    chipIcon: "groups",
    caption: "Organizer view — locked roster and regulars",
    tag: "Organizer",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const data = SLIDES[slide];
  const last = slide === SLIDES.length - 1;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        padding: "60px 26px 36px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22,
        }}
      >
        <img src="/auth/mark_jet.png" width={30} alt="SQUAD" />
        {!last && (
          <button
            type="button"
            className="au-eyebrow"
            style={{
              // A11y (Task 9): 11px label — steel-400 is 4.22:1 on the linen surface
              // (under AA). steel-500 clears (8.7:1). Inline style overrides .au-eyebrow,
              // so the fix lives here, not in auth.css.
              color: "var(--steel-500)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
            onClick={() => router.push("/signup")}
          >
            Skip
          </button>
        )}
      </div>

      {data.image ? (
        <div className="onb-hero">
          <div className="onb-hero-sweep" />
          <div className="clay-ground" />
          <img className="clay-float" src={data.image} alt="" />
        </div>
      ) : (
        <div className="onb-visual" style={{ height: 362 }}>
          <div className="onb-art" />
          <div className="ob-ph-flag">Placeholder · generate later</div>
          <div className="onb-chip">{data.chipIcon && <Icon name={data.chipIcon} size={24} />}</div>
          <div className="onb-center">
            <span className="frame">
              <Icon name="image" size={24} />
            </span>
            <span className="cap">{data.caption}</span>
          </div>
          <div className="onb-tag">
            <span className="dot" />
            {data.tag}
          </div>
        </div>
      )}

      <div style={{ padding: "24px 2px 0" }}>
        {/* A11y (Task 9): 11px terracotta eyebrow — terra-500 is 3.37:1 on the linen-100
            surface (under AA for small text). terra-600 clears (4.77:1) and stays the
            terracotta spike. Large display titles keep their terra-500 <span> (large text
            only needs 3:1). Inline style overrides .au-eyebrow, so the fix lives here. */}
        <div className="au-eyebrow" style={{ color: "var(--terra-600)", marginBottom: 12 }}>
          {data.eyebrow}
        </div>
        <h1 style={titleStyle}>{data.title}</h1>
        <p
          style={{
            margin: "12px 0 0",
            maxWidth: 320,
            fontFamily: "var(--font-body)",
            fontSize: 15,
            lineHeight: 1.5,
            color: "var(--steel-500)",
          }}
        >
          {data.sub}
        </p>
      </div>

      <div style={{ flex: 1, minHeight: 18 }} />

      {last ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Pager active={2} />
          <AuButton trailingArrow onClick={() => router.push("/signup")}>
            Get started
          </AuButton>
          <div className="au-foot au-foot-light">
            Already have an account?{" "}
            <Link className="au-link" href="/signin">
              Log in
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Pager active={slide} />
          <button
            type="button"
            className="au-next is-clay"
            aria-label="Next"
            onClick={() => setSlide((s) => Math.min(s + 1, SLIDES.length - 1))}
          >
            <Icon name="arrow_forward" size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
