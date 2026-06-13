"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { IconButton } from "./icon-button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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
