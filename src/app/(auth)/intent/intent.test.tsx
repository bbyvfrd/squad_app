// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const back = vi.fn();
// next/navigation has no provider in jsdom — stub the router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back }),
}));

import IntentPage from "./page";

describe("IntentPage", () => {
  beforeEach(() => {
    push.mockClear();
    back.mockClear();
  });

  it("renders the title", () => {
    render(<IntentPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("How will you use SQUAD?");
  });

  it("toggles a chip's aria-pressed on click", () => {
    render(<IntentPage />);
    // An off-by-default chip starts unpressed; clicking it turns it on.
    const chip = screen.getByRole("button", { name: "Meet new people" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
  });

  it("pushes /app when Continue is clicked", () => {
    render(<IntentPage />);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(push).toHaveBeenCalledWith("/app");
  });
});
