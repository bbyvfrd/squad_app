// Shared screen frame — the in-flow flex column every auth artboard uses (the phone
// frame itself is dropped; the (auth) layout owns the mobile container). Default
// padding matches the artboard's `64px 26px 30px`; pass `padding` to match a screen
// that differs (e.g. onboarding `60px 26px 36px`, intent `62px 24px 28px`).
//
// Layout: `flex:1` + `min-height` (NOT `position:absolute; inset:0`). On a TALL
// viewport `flex:1` fills the layout column so each screen's own `flex:1` spacer
// still pushes its CTA to the bottom; on a SHORT/landscape viewport the content
// grows past the viewport and the document scrolls, so the bottom CTA stays
// reachable instead of clipping. The bone surface is the layout's; screens fill it.
export function AuthScreen({
  children,
  padding = "64px 26px 30px",
}: {
  children: React.ReactNode;
  padding?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: "100dvh",
        padding,
        background: "var(--bg-card)",
      }}
    >
      {children}
    </div>
  );
}
