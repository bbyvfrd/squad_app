// Shared screen frame — the inner absolutely-positioned flex column every auth
// artboard uses (the phone frame itself is dropped; the (auth) layout owns the
// mobile container). Default padding matches the artboard's `64px 26px 30px`;
// pass `padding` to match a screen that differs (e.g. onboarding `60px 26px 36px`,
// intent `62px 24px 28px`). The bone surface is the layout's; screens fill it.
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
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        padding,
        background: "var(--bg-card)",
      }}
    >
      {children}
    </div>
  );
}
