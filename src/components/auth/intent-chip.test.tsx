// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IntentChip } from "./intent-chip";

describe("IntentChip", () => {
  it("toggles is-on / aria-pressed on click (uncontrolled)", () => {
    render(<IntentChip label="Play weekly" />);
    const chip = screen.getByRole("button", { name: /play weekly/i });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(chip).not.toHaveClass("is-on");

    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip).toHaveClass("is-on");

    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(chip).not.toHaveClass("is-on");
  });
});
