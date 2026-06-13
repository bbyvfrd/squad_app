import "./auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="auth-root"
      // Light-only (Direction B). Re-assert the role tokens the screens consume
      // so they stay light even when the app theme is dark (no [data-theme="light"]
      // selector exists; raw ramps don't flip, these aliases do).
      style={
        {
          colorScheme: "light",
          ["--bg-page" as string]: "var(--linen-200)",
          ["--bg-card" as string]: "var(--linen-100)",
          ["--bg-surface" as string]: "var(--linen-100)",
          minHeight: "100dvh",
          background: "var(--linen-200)",
          display: "flex",
          justifyContent: "center",
        } as React.CSSProperties
      }
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          // Flex column so each screen's `flex:1` spacer still pushes the CTA to the
          // bottom when there's room, but `min-height` (not fixed height) lets content
          // grow and scroll on short/landscape viewports instead of clipping the CTA.
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
          background: "var(--linen-100)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
