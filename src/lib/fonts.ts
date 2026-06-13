import localFont from "next/font/local";

export const montserrat = localFont({
  src: [
    {
      path: "../styles/squad/fonts/Montserrat-VariableFont_wght.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../styles/squad/fonts/Montserrat-Italic-VariableFont_wght.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-montserrat",
  display: "swap",
});

export const karla = localFont({
  src: [
    {
      path: "../styles/squad/fonts/Karla-VariableFont_wght.woff2",
      weight: "200 800",
      style: "normal",
    },
    {
      path: "../styles/squad/fonts/Karla-Italic-VariableFont_wght.woff2",
      weight: "200 800",
      style: "italic",
    },
  ],
  variable: "--font-karla",
  display: "swap",
});

export const materialSymbols = localFont({
  src: [
    {
      path: "../styles/squad/fonts/material-symbols-subset.woff2",
      weight: "100 700",
      style: "normal",
    },
  ],
  variable: "--font-icons",
  display: "block", // hide raw ligature text rather than flash it
  adjustFontFallback: false, // metric fallback is meaningless for glyphs
  preload: true,
});
