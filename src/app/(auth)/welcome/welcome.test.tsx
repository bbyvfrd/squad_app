// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// next/navigation's useRouter has no provider in jsdom — stub it.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));
// next/link needs the App Router context; render it as a plain anchor here.
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import WelcomePage from "./page";

describe("WelcomePage carousel", () => {
  it("renders the first slide title and advances to the second on Next", () => {
    render(<WelcomePage />);

    // Slide 0 (the title is split by a terracotta <span>, so match on the heading text).
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Games on a map near you");

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Slide 1 title.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Claim your spot in one tap",
    );
  });
});
