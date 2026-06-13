import type { Metadata } from "next";
import { karla, materialSymbols, montserrat } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "SQUAD",
  description: "Find games. Run them. Get noticed.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${montserrat.variable} ${karla.variable} ${materialSymbols.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
