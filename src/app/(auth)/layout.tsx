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
          position: "relative",
          minHeight: "100dvh",
          background: "var(--linen-100)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
