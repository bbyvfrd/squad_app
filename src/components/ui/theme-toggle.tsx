"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { IconButton } from "./icon-button";

// false during SSR + hydration, true once mounted on the client — without a
// setState-in-effect (next-themes' resolvedTheme is undefined until hydrated).
function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();
  if (!mounted) return <IconButton icon="dark_mode" label="Toggle theme" ghost disabled />;
  const dark = resolvedTheme === "dark";
  return (
    <IconButton
      icon={dark ? "light_mode" : "dark_mode"}
      label={dark ? "Switch to light mode" : "Switch to dark mode"}
      ghost
      onClick={() => setTheme(dark ? "light" : "dark")}
    />
  );
}
